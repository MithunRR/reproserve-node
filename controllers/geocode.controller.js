/**
 * Public proxy to OSM Nominatim — keeps the User-Agent server-controlled and
 * gives us a single chokepoint for future rate-limiting / caching.
 *
 * GET /api/geocode?q=78701    →   { success, data: { lat, lng, displayName } }
 *                              or { success: false, message } when no match
 */
const { geocode } = require('../services/geocoder');

exports.geocode = async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (!q) {
      return res.status(400).json({ success: false, message: 'Query (q) is required' });
    }

    const hit = await geocode(q);
    if (!hit) {
      return res.status(404).json({ success: false, message: 'No location found for that query' });
    }
    return res.status(200).json({ success: true, data: hit });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
