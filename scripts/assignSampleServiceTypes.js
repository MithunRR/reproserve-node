/*
 * One-time helper: give the existing demo providers a service type so the
 * category / subcategory filters on Find Providers have data to match.
 *
 *   node scripts/assignSampleServiceTypes.js
 *
 * Safe to re-run — only touches providers that still have no service type.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Op } = require('sequelize');
const db = require('../models');
const { seedServiceTypes, resolveServiceTypeId } = require('../config/serviceTypeData');

// businessName pattern  ->  service type to assign
const ASSIGNMENTS = [
  { match: /a\.?\s*b\.?\s*c/i, serviceType: 'Handyman' },
  { match: /onetech/i,         serviceType: 'Interior Designer / Stager' }
];

(async () => {
  try {
    await db.sequelize.authenticate();
    await seedServiceTypes(db);

    const providers = await db.User.findAll({
      where: {
        role: { [Op.in]: ['service_provider', 'realtor'] },
        serviceTypeId: { [Op.is]: null }
      }
    });

    if (providers.length === 0) {
      console.log('No providers without a service type — nothing to do.');
      process.exit(0);
    }

    let updated = 0;
    for (const provider of providers) {
      const rule = ASSIGNMENTS.find((a) => a.match.test(provider.businessName || ''));
      if (!rule) {
        console.log(`  skip  #${provider.id} "${provider.businessName}" (no matching rule)`);
        continue;
      }
      const serviceTypeId = await resolveServiceTypeId(db, rule.serviceType);
      provider.serviceTypeId = serviceTypeId;
      await provider.save();
      updated += 1;
      console.log(`  set   #${provider.id} "${provider.businessName}" -> ${rule.serviceType} (id ${serviceTypeId})`);
    }

    console.log(`\nDone. ${updated} provider(s) updated.`);
    process.exit(0);
  } catch (err) {
    console.error('Assignment failed:', err.message);
    process.exit(1);
  }
})();
