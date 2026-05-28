/**
 * Adds the email-verification-link columns to `users`:
 *
 *   emailVerified           BOOLEAN  default false
 *   verificationToken       VARCHAR(255)  null
 *   verificationExpiresAt   DATETIME      null
 *
 * Existing users are backfilled to emailVerified = true so they can keep
 * logging in (they pre-date the gate).
 *
 * Idempotent — safe to run multiple times. Also drops the legacy `otps` table
 * left over from the earlier OTP iteration.
 */
const mysql = require('mysql2/promise');
const DB = { host: 'localhost', user: 'root', password: '', database: 'reproserve' };

async function columnExists(conn, column) {
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = ?`,
    [DB.database, column]
  );
  return rows.length > 0;
}

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [DB.database, table]
  );
  return rows.length > 0;
}

(async () => {
  const conn = await mysql.createConnection(DB);
  try {
    if (!(await columnExists(conn, 'emailVerified'))) {
      await conn.query(`ALTER TABLE users ADD COLUMN emailVerified TINYINT(1) NOT NULL DEFAULT 0 AFTER licenseNumber`);
      console.log('[+] added users.emailVerified');
      const [r] = await conn.query(`UPDATE users SET emailVerified = 1 WHERE emailVerified = 0`);
      console.log(`    backfilled ${r.affectedRows} existing users as verified`);
    } else console.log('[=] users.emailVerified already exists — skipped');

    if (!(await columnExists(conn, 'verificationToken'))) {
      await conn.query(`ALTER TABLE users ADD COLUMN verificationToken VARCHAR(255) NULL AFTER emailVerified`);
      console.log('[+] added users.verificationToken');
    } else console.log('[=] users.verificationToken already exists — skipped');

    if (!(await columnExists(conn, 'verificationExpiresAt'))) {
      await conn.query(`ALTER TABLE users ADD COLUMN verificationExpiresAt DATETIME NULL AFTER verificationToken`);
      console.log('[+] added users.verificationExpiresAt');
    } else console.log('[=] users.verificationExpiresAt already exists — skipped');

    if (await tableExists(conn, 'otps')) {
      await conn.query(`DROP TABLE otps`);
      console.log('[~] dropped legacy otps table');
    }

    console.log('Done.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
