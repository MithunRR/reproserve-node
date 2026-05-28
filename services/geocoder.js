/**
 * OpenStreetMap Nominatim geocoder.
 *
 *   geocode("120 Main St, Austin, TX 78701")
 *     → { lat: 30.27, lng: -97.74, displayName: "..." }   on success
 *     → null                                              on failure
 *
 * Nominatim policy (https://operations.osmfoundation.org/policies/nominatim/):
 *   - Identify yourself with a User-Agent that includes contact info.
 *   - No more than 1 request/second from a single source.
 *   - Cache when possible; do not bulk-geocode without coordinating with OSM.
 *
 * This is a thin, non-throwing wrapper — callers should handle `null` as
 * "could not resolve" and continue without coords.
 */
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT =
  process.env.GEOCODER_USER_AGENT ||
  'ReproServe/1.0 (admin@reproserve.local)';

// Compose the parts of an address row into a single query string, dropping
// any empty pieces.
const buildQuery = (parts) =>
  parts
    .map((p) => (p == null ? '' : String(p).trim()))
    .filter(Boolean)
    .join(', ');

async function geocode(query) {
  const q = typeof query === 'string'
    ? query.trim()
    : buildQuery([query?.streetAddress, query?.city, query?.state, query?.zipCode]);

  if (!q) return null;

  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en'
      }
    });
    if (!res.ok) {
      console.warn(`[geocoder] HTTP ${res.status} for "${q}"`);
      return null;
    }
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) return null;

    const hit = arr[0];
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng, displayName: hit.display_name || q };
  } catch (err) {
    console.warn(`[geocoder] error geocoding "${q}":`, err.message);
    return null;
  }
}

// Sleep helper for the backfill script which must throttle to ≤1 req/s.
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { geocode, sleep, buildQuery };
