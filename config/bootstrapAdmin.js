/**
 * Bootstraps an admin account on server start if (and only if) no admin
 * exists yet. Credentials come from .env:
 *
 *   ADMIN_EMAIL=admin@example.com
 *   ADMIN_PASSWORD=ChangeMe123!
 *
 * Idempotent: if an admin already exists, this is a no-op. The function never
 * overwrites an existing admin's password — the admin should change their
 * password through the normal Change Password flow.
 */
const bcrypt = require('bcryptjs');

async function bootstrapAdmin(db) {
  const { User } = db;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('[bootstrapAdmin] ADMIN_EMAIL / ADMIN_PASSWORD not set — skipped');
    return;
  }

  const existing = await User.findOne({ where: { role: 'admin' } });
  if (existing) {
    console.log(`[bootstrapAdmin] admin already exists (${existing.email}) — skipped`);
    return;
  }

  const hashed = bcrypt.hashSync(password, 10);
  const account = await User.create({
    role: 'admin',
    registerAs: 'individual',
    firstName: 'Admin',
    lastName: 'User',
    email,
    password: hashed,
    emailVerified: true,
    isActive: true
  });
  console.log(`[bootstrapAdmin] created admin id=${account.id} email=${email}`);
}

module.exports = { bootstrapAdmin };
