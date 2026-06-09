// Quick standalone test: load the model, attach the afterCreate hook,
// create a notification, and see if the hook fires.

require('dotenv').config();
const db = require('../models');

let fired = false;
db.Notification.addHook('afterCreate', (notification) => {
  fired = true;
  const plain = notification.get({ plain: true });
  console.log('[HOOK FIRED] payload:', JSON.stringify(plain, null, 2));
});

(async () => {
  try {
    await db.sequelize.authenticate();
    console.log('DB connected');

    const admin = await db.User.findOne({ where: { role: 'admin' } });
    if (!admin) {
      console.error('No admin user found — pick any existing user id to test');
      process.exit(1);
    }

    console.log(`Creating notification for user ${admin.id} ...`);
    const n = await db.Notification.create({
      userId: admin.id,
      type: 'general',
      title: 'Hook test',
      message: 'If you see this, afterCreate hook works',
      link: null
    });
    console.log('Created notification id:', n.id);

    if (fired) {
      console.log('✅ afterCreate hook fired — backend hook mechanism works');
    } else {
      console.log('❌ afterCreate hook did NOT fire — that is the bug');
    }

    // Clean up: delete the test notification so we don't leave junk.
    await n.destroy();
    console.log('Test notification cleaned up');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
})();
