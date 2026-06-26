/**
 * Adds the trust-indicator / public-profile columns to `users`:
 *
 *   profilePhoto        VARCHAR(255)  null
 *   specialties         TEXT          null   (JSON-encoded string array)
 *   responseTime        VARCHAR(50)   null
 *   yearsOfExperience   INT           null
 *
 * These back the provider trust badges, specialties chips, response-time and
 * experience shown on the public provider cards / detail page.
 *
 * Idempotent — each column is only added when missing, so it is safe to run
 * multiple times.
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

// column => DDL fragment (added AFTER a known existing column for tidy ordering).
const COLUMNS = [
  ['profilePhoto',      `ADD COLUMN profilePhoto VARCHAR(255) NULL AFTER licenseNumber`],
  ['specialties',       `ADD COLUMN specialties TEXT NULL AFTER profilePhoto`],
  ['responseTime',      `ADD COLUMN responseTime VARCHAR(50) NULL AFTER specialties`],
  ['yearsOfExperience', `ADD COLUMN yearsOfExperience INT NULL AFTER responseTime`]
];

(async () => {
  const conn = await mysql.createConnection(DB);
  try {
    for (const [name, ddl] of COLUMNS) {
      if (await columnExists(conn, name)) {
        console.log(`[=] users.${name} already exists — skipped`);
      } else {
        await conn.query(`ALTER TABLE users ${ddl}`);
        console.log(`[+] added column users.${name}`);
      }
    }

    const [desc] = await conn.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
         AND COLUMN_NAME IN ('profilePhoto','specialties','responseTime','yearsOfExperience')
       ORDER BY ORDINAL_POSITION`,
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
