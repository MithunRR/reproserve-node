/**
 * 1. Extends the users.role ENUM to include 'admin'
 * 2. Seeds a specific admin row directly into the DB
 *
 * Idempotent — safe to run multiple times. Updates the admin's password if the
 * row already exists.
 *
 * Reads ADMIN_EMAIL / ADMIN_PASSWORD from .env, falling back to constants if
 * absent (so the script is also useful as a one-off bootstrap).
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const DB = { host: 'localhost', user: 'root', password: '', database: 'reproserve' };

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'mithunrrathod7@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '!qazQAZwsxWSX123';

(async () => {
  const conn = await mysql.createConnection(DB);
  try {
    // 1. Widen the role enum if 'admin' isn't already in it.
    const [[col]] = await conn.query(
      `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'`,
      [DB.database]
    );
    if (col && !col.COLUMN_TYPE.includes("'admin'")) {
      await conn.query(`ALTER TABLE users MODIFY COLUMN role
        ENUM('user','service_provider','realtor','admin') NOT NULL DEFAULT 'user'`);
      console.log("[+] extended users.role enum to include 'admin'");
    } else {
      console.log('[=] users.role enum already includes admin — skipped');
    }

    // 2. Hash the password and upsert the admin row.
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    const [[existing]] = await conn.query(
      'SELECT id, role FROM users WHERE email = ? LIMIT 1',
      [ADMIN_EMAIL]
    );
    if (existing) {
      await conn.query(
        `UPDATE users
           SET role = 'admin', password = ?, emailVerified = 1,
               firstName = COALESCE(NULLIF(firstName, ''), 'Admin'),
               lastName  = COALESCE(NULLIF(lastName,  ''), 'User')
         WHERE id = ?`,
        [hash, existing.id]
      );
      console.log(`[~] updated existing user #${existing.id} → admin (password reset)`);
    } else {
      const [r] = await conn.query(
        `INSERT INTO users
           (role, registerAs, firstName, lastName, email, password,
            emailVerified, isActive, createdAt, updatedAt)
         VALUES
           ('admin', 'individual', 'Admin', 'User', ?, ?, 1, 1, NOW(), NOW())`,
        [ADMIN_EMAIL, hash]
      );
      console.log(`[+] created admin user id=${r.insertId} email=${ADMIN_EMAIL}`);
    }

    const [rows] = await conn.query(
      'SELECT id, role, email, emailVerified FROM users WHERE role = ?',
      ['admin']
    );
    console.table(rows);
    console.log('Done.');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
