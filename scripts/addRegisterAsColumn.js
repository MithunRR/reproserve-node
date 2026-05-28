/**
 * Adds the `registerAs` column to `users` — captures whether a new signup
 * registered as an Individual or as a Business (the radio at the top of the
 * register form).
 *
 * Existing rows are backfilled from their role:
 *   role = 'user'              → registerAs = 'individual'
 *   role = 'service_provider'  → registerAs = 'business'
 *   role = 'realtor'           → registerAs = 'business'
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
    if (await columnExists(conn, 'registerAs')) {
      console.log('[=] users.registerAs already exists — skipped');
    } else {
      await conn.query(
        `ALTER TABLE users ADD COLUMN registerAs ENUM('individual','business') NULL AFTER role`
      );
      console.log('[+] added column users.registerAs');

      const [r1] = await conn.query(
        `UPDATE users SET registerAs = 'individual' WHERE role = 'user' AND registerAs IS NULL`
      );
      console.log(`    backfilled individual (${r1.affectedRows} rows)`);

      const [r2] = await conn.query(
        `UPDATE users SET registerAs = 'business'
         WHERE role IN ('service_provider','realtor') AND registerAs IS NULL`
      );
      console.log(`    backfilled business   (${r2.affectedRows} rows)`);
    }

    const [counts] = await conn.query(
      `SELECT registerAs, COUNT(*) AS n FROM users GROUP BY registerAs`
    );
    console.table(counts);
    console.log('Done.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
