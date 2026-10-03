import "server-only";

// Google Maps share-link parsing (spec §2 step 4).
// Long-form URLs carry @lat,lng or ?q=lat,lng — regex. Short links
// (maps.app.goo.gl / bit.ly-style) hide coordinates — fetch the redirect
// server-side, then parse the expanded URL.

export type Coords = { latitude: number; longitude: number };

const COORD_RE = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
const Q_RE = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/;

function parseCoordsFromUrl(url: string): Coords | null {
  const m = COORD_RE.exec(url) ?? Q_RE.exec(url);
  if (!m) return null;
  const latitude = Number.parseFloat(m[1]);
  const longitude = Number.parseFloat(m[2]);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

export async function parseMapsLink(
  input: string,
): Promise<Coords | null> {
  const raw = input.trim();
  if (!raw) return null;

  // direct coordinate paste ("28.6139, 77.2090")
  const direct = /^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/.exec(raw);
  if (direct) return parseCoordsFromUrl(`@${direct[1]},${direct[2]}`);

  const looksLikeUrl = /^https?:\/\//i.test(raw) || /^maps\.app\.goo\.gl\//i.test(raw);
  if (!looksLikeUrl) return null;
  const url = raw.startsWith("http") ? raw : `https://${raw}`;

  const directHit = parseCoordsFromUrl(url);
  if (directHit) return directHit;

  // short link → follow redirect (max 2 hops) and parse the expanded URL
  try {
    let current = url;
    for (let hop = 0; hop < 2; hop++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(current, {
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": "automi-setup/1.0" },
      });
      clearTimeout(timeout);
      const finalUrl = res.url || current;
      const hit = parseCoordsFromUrl(finalUrl);
      if (hit) return hit;
      if (finalUrl === current) break;
      current = finalUrl;
    }
  } catch {
    // network hiccup → caller falls back to manual entry
  }
  return null;
}
