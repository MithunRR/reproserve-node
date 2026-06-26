/**
 * Idempotent sample-data seeder for the trust-indicator columns.
 *
 * For every existing user with role 'service_provider' or 'realtor' that is
 * MISSING trust data, fills in sensible deterministic sample values:
 *
 *   profilePhoto      -> https://i.pravatar.cc/300?u=<userId>  (stable per user)
 *   specialties       -> JSON array of 2-3 specialties based on serviceType name
 *   responseTime      -> one of three buckets, picked deterministically by id
 *   yearsOfExperience -> deterministic 2..15 derived from id
 *
 * Only NULL/empty columns are touched — real data entered by a user is never
 * overwritten. Safe to run multiple times.
 *
 * Run with:  node scripts/seedTrustSampleData.js
 */
const db = require('../models');
const { Op } = require('sequelize');

const { User, ServiceType } = db;

const PROVIDER_ROLES = ['service_provider', 'realtor'];

const RESPONSE_TIMES = ['Within 1 hour', 'Within a few hours', 'Within a day'];

const GENERIC_SPECIALTIES = ['General Repairs', 'Maintenance', 'Consultations'];

// serviceType name (lowercased, matched by keyword) -> specialty list.
const SPECIALTY_MAP = [
  ['plumb',     ['Leak Repair', 'Pipe Installation', 'Water Heaters']],
  ['electric',  ['Wiring & Rewiring', 'Lighting Installation', 'Panel Upgrades']],
  ['clean',     ['Deep Cleaning', 'Move-out Cleaning', 'Carpet Cleaning']],
  ['paint',     ['Interior Painting', 'Exterior Painting', 'Cabinet Refinishing']],
  ['carpen',    ['Custom Cabinetry', 'Framing', 'Trim & Molding']],
  ['roof',      ['Roof Repair', 'Shingle Replacement', 'Leak Sealing']],
  ['hvac',      ['AC Installation', 'Heating Repair', 'Duct Cleaning']],
  ['landscap',  ['Lawn Care', 'Garden Design', 'Tree Trimming']],
  ['pest',      ['Termite Control', 'Rodent Removal', 'Eco-friendly Treatments']],
  ['floor',     ['Hardwood Installation', 'Tile Work', 'Refinishing']],
  ['mov',       ['Local Moves', 'Packing Services', 'Furniture Assembly']],
  ['handy',     ['Furniture Assembly', 'Drywall Repair', 'Fixture Installation']],
  ['realt',     ['Buyer Representation', 'Listing & Marketing', 'Market Analysis']],
  ['real estate', ['Buyer Representation', 'Listing & Marketing', 'Market Analysis']]
];

function specialtiesFor(role, serviceTypeName) {
  const name = String(serviceTypeName || '').toLowerCase();
  if (name) {
    const hit = SPECIALTY_MAP.find(([kw]) => name.includes(kw));
    if (hit) return hit[1];
  }
  if (role === 'realtor') {
    return ['Buyer Representation', 'Listing & Marketing', 'Market Analysis'];
  }
  return GENERIC_SPECIALTIES;
}

const isEmptyStr = (v) => v == null || String(v).trim() === '';

(async () => {
  try {
    await db.sequelize.authenticate();

    const providers = await User.findAll({
      where: { role: { [Op.in]: PROVIDER_ROLES } },
      include: [{ model: ServiceType, as: 'serviceType' }]
    });

    let updated = 0;

    for (const p of providers) {
      const changes = {};

      if (isEmptyStr(p.profilePhoto)) {
        changes.profilePhoto = `https://i.pravatar.cc/300?u=${p.id}`;
      }

      if (isEmptyStr(p.specialties)) {
        const list = specialtiesFor(p.role, p.serviceType && p.serviceType.name);
        changes.specialties = JSON.stringify(list);
      }

      if (isEmptyStr(p.responseTime)) {
        changes.responseTime = RESPONSE_TIMES[p.id % RESPONSE_TIMES.length];
      }

      if (p.yearsOfExperience == null) {
        // Deterministic 2..15 derived from the user id.
        changes.yearsOfExperience = 2 + (p.id % 14);
      }

      if (Object.keys(changes).length > 0) {
        await p.update(changes);
        updated += 1;
      }
    }

    console.log(`[seedTrustSampleData] providers/realtors scanned: ${providers.length}`);
    console.log(`[seedTrustSampleData] rows updated with sample data: ${updated}`);
    console.log('Done.');
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
})();
