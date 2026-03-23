export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const page = searchParams.get("page") || "0";
  const size = searchParams.get("size") || "200";
  const city = searchParams.get("city") || "";

  const apiKey = process.env.TICKETMASTER_KEY;
  if (!apiKey) {
    return Response.json({ error: "TICKETMASTER_KEY not configured" }, { status: 500 });
  }

  try {
    let url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&page=${page}&size=${Math.min(Number(size), 200)}&sort=relevance,desc&countryCode=US`;
    if (q) url += `&keyword=${encodeURIComponent(q)}`;
    if (city) url += `&city=${encodeURIComponent(city)}`;

    const res = await fetch(url);
    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: `Ticketmaster error: ${res.status}`, details: errText }, { status: res.status });
    }

    const data = await res.json();
    const items = data?._embedded?.events || [];

    const events = items.map((ev) => {
      const venue = ev._embedded?.venues?.[0] || {};
      const startDate = ev.dates?.start?.localDate || "";
      const startTime = ev.dates?.start?.localTime || "";
      const dateTime = startDate && startTime ? `${startDate}T${startTime}` : startDate ? `${startDate}T12:00:00` : "";

      return {
        id: `tm-${ev.id}`,
        name: ev.name || "Unknown Event",
        date: startDate,
        dd: dateTime ? new Date(dateTime).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "TBD",
        time: startTime ? new Date(`2000-01-01T${startTime}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "TBD",
        venue: venue.name || "TBD",
        addr: [venue.address?.line1, venue.city?.name, venue.state?.stateCode, venue.postalCode].filter(Boolean).join(", "),
        cat: ev.classifications?.[0]?.segment?.name || "Other",
        minPrice: ev.priceRanges?.[0]?.min ? `$${ev.priceRanges[0].min}` : "",
        maxPrice: ev.priceRanges?.[0]?.max ? `$${ev.priceRanges[0].max}` : "",
        ticketmasterUrl: ev.url || "",
        ph: "",
        alt: "",
        altL: "",
        source: "ticketmaster",
      };
    });

    return Response.json({
      events,
      total: data?.page?.totalElements || events.length,
      page: Number(data?.page?.number || page),
      totalPages: data?.page?.totalPages || 1,
      source: "Ticketmaster",
    });
  } catch (err) {
    return Response.json({ error: "Failed to fetch from Ticketmaster", details: err.message }, { status: 500 });
  }
}
