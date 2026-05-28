/**
 * One-time backfill: geocode every service_provider/realtor account that has
 * an address but no latitude/longitude yet. Throttled to 1 req/sec to respect
 * OSM Nominatim usage policy.
 *
 * Usage:   node scripts/geocode-backfill.js
 *
 * Safe to re-run — only rows still missing coords are touched.
 */
require('dotenv').config();
const db = require('../models');
const { Op } = require('sequelize');
const { geocode, sleep, buildQuery } = require('../services/geocoder');

async function main() {
  const { User } = db;
  await db.sequelize.authenticate();

  const targets = await User.findAll({
    where: {
      role: { [Op.in]: ['service_provider', 'realtor'] },
      [Op.or]: [{ latitude: null }, { longitude: null }]
    },
    attributes: ['id', 'role', 'streetAddress', 'city', 'state', 'zipCode']
  });

  console.log(`[backfill] ${targets.length} accounts need geocoding`);
  let updated = 0;
  let skipped = 0;

  for (const u of targets) {
    const query = buildQuery([u.streetAddress, u.city, u.state, u.zipCode]);
    if (!query) {
      skipped += 1;
      console.log(`  · #${u.id} skipped (no address)`);
      continue;
    }

    const coords = await geocode({
      streetAddress: u.streetAddress,
      city: u.city,
      state: u.state,
      zipCode: u.zipCode
    });

    if (coords) {
      await User.update(
        { latitude: coords.lat, longitude: coords.lng },
        { where: { id: u.id } }
      );
      updated += 1;
      console.log(`  ✓ #${u.id} → (${coords.lat}, ${coords.lng})  ${query}`);
    } else {
      skipped += 1;
      console.log(`  ✗ #${u.id} no result for "${query}"`);
    }

    // Nominatim policy: max 1 req/sec.
    await sleep(1100);
  }

  console.log(`[backfill] done. updated=${updated} skipped=${skipped} total=${targets.length}`);
  await db.sequelize.close();
}

main().catch((err) => {
  console.error('[backfill] fatal:', err);
  process.exit(1);
});
