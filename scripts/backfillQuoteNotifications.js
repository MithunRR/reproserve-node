/*
 * One-time backfill: create a notification for every existing quote that
 * targets a provider/realtor but predates the notify-on-create change.
 *
 *   node scripts/backfillQuoteNotifications.js
 *
 * Safe to re-run — skips quotes whose notification already exists.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Op } = require('sequelize');
const db = require('../models');

(async () => {
  try {
    await db.sequelize.authenticate();

    const quotes = await db.Quote.findAll({
      where: { providerId: { [Op.not]: null } },
      order: [['createdAt', 'ASC']]
    });

    let created = 0;
    let fixed = 0;
    for (const q of quotes) {
      const isMeeting = q.isMeetingRequest;
      const title = isMeeting ? 'New meeting request' : 'New quote request';
      const message = `${q.name || 'Someone'} sent you ${isMeeting ? 'a meeting request' : 'a quote request'}` +
        `${q.category ? ` for ${q.category}` : ''}.`;
      const link = `/request/${q.id}`;

      // Idempotent: reuse an identical notification if one already exists,
      // just making sure its link points at the request.
      const existing = await db.Notification.findOne({
        where: { userId: q.providerId, title, message }
      });
      if (existing) {
        if (existing.link !== link) {
          existing.link = link;
          await existing.save();
          fixed += 1;
          console.log(`  fix   quote#${q.id} -> updated notification link to ${link}`);
        } else {
          console.log(`  skip  quote#${q.id} (notification already up to date)`);
        }
        continue;
      }

      await db.Notification.create({
        userId: q.providerId,
        type: isMeeting ? 'meeting_request' : 'quote_request',
        title,
        message,
        link
      });
      created += 1;
      console.log(`  set   quote#${q.id} -> notification for user#${q.providerId}`);
    }

    console.log(`\nDone. ${created} notification(s) created, ${fixed} link(s) fixed.`);
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed:', err.message);
    process.exit(1);
  }
})();
