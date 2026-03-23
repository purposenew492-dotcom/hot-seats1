export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const venue = searchParams.get("venue") || "";
  const address = searchParams.get("address") || "";

  const key = process.env.GOOGLE_PLACES_KEY;
  if (!key) {
    return Response.json({ error: "GOOGLE_PLACES_KEY not configured" }, { status: 500 });
  }

  if (!venue) {
    return Response.json({ error: "venue parameter required" }, { status: 400 });
  }

  try {
    // Step 1: Find Place
    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(venue + " " + address)}&inputtype=textquery&fields=place_id,name,formatted_address&key=${key}`;
    const findRes = await fetch(findUrl);
    const findData = await findRes.json();

    if (!findData.candidates || findData.candidates.length === 0) {
      return Response.json({ phone: null, error: "Venue not found" });
    }

    const placeId = findData.candidates[0].place_id;

    // Step 2: Get Details (phone number)
    const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_phone_number,international_phone_number,formatted_address,website&key=${key}`;
    const detailRes = await fetch(detailUrl);
    const detailData = await detailRes.json();

    if (!detailData.result) {
      return Response.json({ phone: null, error: "Place details not available" });
    }

    return Response.json({
      phone: detailData.result.formatted_phone_number || detailData.result.international_phone_number || null,
      name: detailData.result.name || venue,
      address: detailData.result.formatted_address || address,
      website: detailData.result.website || "",
      source: "Google Places",
      cachedAt: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json({ error: "Google Places lookup failed", details: err.message }, { status: 500 });
  }
}
