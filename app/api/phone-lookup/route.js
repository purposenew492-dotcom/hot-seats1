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

  const query = venue + (address ? " " + address : "");

  try {
    // Try Method 1: Find Place From Text
    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name,formatted_address&key=${key}`;
    const findRes = await fetch(findUrl);
    const findData = await findRes.json();

    let placeId = null;

    if (findData.candidates && findData.candidates.length > 0) {
      placeId = findData.candidates[0].place_id;
    } else {
      // Try Method 2: Text Search (more flexible)
      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + " box office")}&key=${key}`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();

      if (searchData.results && searchData.results.length > 0) {
        placeId = searchData.results[0].place_id;
      } else {
        // Try Method 3: Just venue name
        const simpleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(venue)}&key=${key}`;
        const simpleRes = await fetch(simpleUrl);
        const simpleData = await simpleRes.json();

        if (simpleData.results && simpleData.results.length > 0) {
          placeId = simpleData.results[0].place_id;
        }
      }
    }

    if (!placeId) {
      return Response.json({ 
        phone: null, 
        error: "Venue not found",
        debug: { query, findStatus: findData.status, findError: findData.error_message || null }
      });
    }

    // Get Place Details (phone number)
    const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_phone_number,international_phone_number,formatted_address,website&key=${key}`;
    const detailRes = await fetch(detailUrl);
    const detailData = await detailRes.json();

    if (!detailData.result) {
      return Response.json({ 
        phone: null, 
        error: "Place details not available",
        debug: { placeId, detailStatus: detailData.status }
      });
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
