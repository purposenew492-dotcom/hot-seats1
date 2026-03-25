import { NextResponse } from "next/server";

const GKEY = process.env.GOOGLE_PLACES_KEY || "";

async function searchPlace(query) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GKEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.results?.[0] || null;
}

async function getDetails(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number,name,formatted_address,website&key=${GKEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.result || null;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const venue = searchParams.get("venue") || "";
  const city = searchParams.get("city") || "";

  if (!venue || !GKEY) {
    return NextResponse.json({ error: "Missing venue or API key" }, { status: 400 });
  }

  try {
    const searchBase = city ? `${venue} ${city}` : venue;

    const [boxOfficePlace, venuePlace] = await Promise.all([
      searchPlace(`${searchBase} box office`).then(async (p) => {
        if (!p) {
          return searchPlace(`${searchBase} ticket office`);
        }
        return p;
      }),
      searchPlace(searchBase)
    ]);
    let boxOfficeDetail = null;
    let venueDetail = null;

    const detailPromises = [];

    if (boxOfficePlace?.place_id) {
      detailPromises.push(
        getDetails(boxOfficePlace.place_id).then(d => { boxOfficeDetail = d; })
      );
    }

    if (venuePlace?.place_id) {
      detailPromises.push(
        getDetails(venuePlace.place_id).then(d => { venueDetail = d; })
      );
    }

    await Promise.all(detailPromises);

    let phone = null;
    let phoneName = "";
    let alt_phone = null;
    let alt_phone_label = "";
    let address = "";
    let website = "";

    if (boxOfficeDetail?.formatted_phone_number) {
      phone = boxOfficeDetail.formatted_phone_number;
      phoneName = boxOfficeDetail.name || venue;
    }

    if (venueDetail?.formatted_phone_number) {
      if (phone && venueDetail.formatted_phone_number !== phone) {
        alt_phone = venueDetail.formatted_phone_number;
        alt_phone_label = "Venue Main Line";
      } else if (!phone) {
        phone = venueDetail.formatted_phone_number;
        phoneName = venueDetail.name || venue;
      }
      address = venueDetail.formatted_address || "";
      website = venueDetail.website || "";
    }

    if (!phone) {
      const broadPlace = await searchPlace(venue);
      if (broadPlace?.place_id) {
        const broadDetail = await getDetails(broadPlace.place_id);
        if (broadDetail?.formatted_phone_number) {
          phone = broadDetail.formatted_phone_number;
          phoneName = broadDetail.name || venue;
          address = broadDetail.formatted_address || address;
          website = broadDetail.website || website;
        }
      }
    }

    return NextResponse.json({
      phone: phone || null,
      name: phoneName || venue,
      alt_phone: alt_phone || null,
      alt_phone_label: alt_phone_label || "",
      address,
      website,
      source: "google",
      cachedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error("Phone lookup error:", err);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
