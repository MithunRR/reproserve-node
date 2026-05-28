/**
 * Adds the `licenseNumber` column to `users` — captures the optional licence /
 * registration number that service providers and realtors provide on the
 * register form (and can edit later from Profile → Settings → Business Details).
 *
 * Idempotent — safe to run multiple times.
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

(async () => {
  const conn = await mysql.createConnection(DB);
  try {
    if (await columnExists(conn, 'licenseNumber')) {
      console.log('[=] users.licenseNumber already exists — skipped');
    } else {
      await conn.query(
        `ALTER TABLE users ADD COLUMN licenseNumber VARCHAR(100) NULL AFTER businessDesc`
      );
      console.log('[+] added column users.licenseNumber');
    }
    const [desc] = await conn.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'licenseNumber'`,
      [DB.database]
    );
    console.table(desc);
    console.log('Done.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
