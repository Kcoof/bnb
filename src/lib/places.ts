import "server-only";

// Google Places — "what's nearby" is a LIVE search, never AI-invented (spec §5).

export function placesConfigured(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY);
}

export type NearbyPlace = { name: string; type: string; distance?: string; rating?: number };

export async function searchNearby(
  latitude: number,
  longitude: number,
  query: string,
): Promise<NearbyPlace[] | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  // nearby search via Text Search (New) — one call, radius-biased
  const res = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.rating,places.googleMapsUri",
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 5,
        locationBias: {
          circle: { center: { latitude, longitude }, radius: 2000 },
        },
      }),
    },
  ).catch(() => null);

  if (!res || !res.ok) return null;
  const json = (await res.json()) as {
    places?: {
      displayName?: { text?: string };
      formattedAddress?: string;
      rating?: number;
    }[];
  };
  if (!json.places?.length) return null;

  return json.places.slice(0, 5).map((p) => ({
    name: p.displayName?.text ?? "Unnamed place",
    type: p.formattedAddress ?? "",
    rating: p.rating,
  }));
}
