export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const page = searchParams.get("page") || "1";
  const pageSize = searchParams.get("page_size") || "100";
  const category = searchParams.get("category") || "";
  const countryCode = searchParams.get("country_code") || "US";

  const token = process.env.STUBHUB_TOKEN;
  if (!token) {
    return Response.json({ error: "STUBHUB_TOKEN not configured" }, { status: 500 });
  }

  try {
    let url = `https://api.stubhub.net/catalog/events/search?page=${page}&page_size=${pageSize}&sort=start_date&country_code=${countryCode}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: `StubHub API error: ${res.status}`, details: errText }, { status: res.status });
    }

    const data = await res.json();
    const items = data?._embedded?.items || [];

    const events = items.map((ev) => ({
      id: String(ev.id),
      name: ev.name || "Unknown Event",
      date: ev.start_date ? ev.start_date.split("T")[0] : "",
      dateDisplay: ev.start_date
        ? new Date(ev.start_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
        : "TBD",
      time: ev.start_date
        ? new Date(ev.start_date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
        : "TBD",
      venue: ev._embedded?.venue?.name || "TBD",
      addr: [
        ev._embedded?.venue?.city,
        ev._embedded?.venue?.state_province,
        ev._embedded?.venue?.postal_code,
      ].filter(Boolean).join(", "),
      cat: ev._embedded?.categories?.[0]?.name || "Other",
      minPrice: ev.min_ticket_price?.display || "",
      stubhubUrl: ev._links?.["event:webpage"]?.href || "",
      ph: "",  // Will be filled by Google Places lookup
      alt: "",
      altL: "",
    }));

    return Response.json({
      events,
      total: data?.total_items || 0,
      page: data?.page || 1,
      pageSize: data?.page_size || 100,
    });
  } catch (err) {
    return Response.json({ error: "Failed to fetch from StubHub", details: err.message }, { status: 500 });
  }
}
