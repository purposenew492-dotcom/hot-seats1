export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const page = searchParams.get("page") || "1";
  const perPage = searchParams.get("per_page") || "200";
  const type = searchParams.get("type") || "";
  const city = searchParams.get("city") || "";
  const taxonomies = searchParams.get("taxonomies") || "";

  const clientId = process.env.SEATGEEK_CLIENT_ID;
  if (!clientId) {
    return Response.json({ error: "SEATGEEK_CLIENT_ID not configured" }, { status: 500 });
  }

  try {
    let url = `https://api.seatgeek.com/2/events?client_id=${clientId}&page=${page}&per_page=${perPage}&sort=score.desc`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    if (type) url += `&type=${encodeURIComponent(type)}`;
    if (city) url += `&venue.city=${encodeURIComponent(city)}`;
    if (taxonomies) url += `&taxonomies.name=${encodeURIComponent(taxonomies)}`;
    const now = new Date().toISOString().split("T")[0];
    url += `&datetime_utc.gte=${now}`;

    const res = await fetch(url);
    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: `SeatGeek error: ${res.status}`, details: errText }, { status: res.status });
    }

    const data = await res.json();
    const items = data?.events || [];

    const events = items.map((ev) => ({
      id: `sg-${ev.id}`,
      name: ev.short_title || ev.title || "Unknown Event",
      date: ev.datetime_local ? ev.datetime_local.split("T")[0] : "",
      dd: ev.datetime_local ? new Date(ev.datetime_local).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "TBD",
      time: ev.datetime_local ? new Date(ev.datetime_local).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "TBD",
      venue: ev.venue?.name || "TBD",
      addr: [ev.venue?.address, ev.venue?.city, ev.venue?.state, ev.venue?.postal_code].filter(Boolean).join(", "),
      cat: ev.type || ev.taxonomies?.[0]?.name || "Other",
      subcat: ev.taxonomies?.[1]?.name || ev.performers?.[0]?.taxonomies?.[0]?.name || "",
      minPrice: ev.stats?.lowest_price ? `$${ev.stats.lowest_price}` : "",
      avgPrice: ev.stats?.average_price ? `$${ev.stats.average_price}` : "",
      listingCount: ev.stats?.listing_count || 0,
      popularity: ev.score ? Math.round(ev.score * 100) : 0,
      seatgeekUrl: ev.url || "",
      ph: "", alt: "", altL: "",
      source: "seatgeek",
    }));

    return Response.json({
      events,
      total: data?.meta?.total || events.length,
      page: Number(data?.meta?.page || page),
      perPage: Number(data?.meta?.per_page || perPage),
      source: "SeatGeek",
    });
  } catch (err) {
    return Response.json({ error: "Failed to fetch from SeatGeek", details: err.message }, { status: 500 });
  }
}
