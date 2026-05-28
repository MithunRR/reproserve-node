/*
 * One-time migration: add the `providerCompleted` column to the quotes table.
 * It backs the completion handshake — the provider marks the work done, then
 * the customer confirms (status -> closed).
 *
 *   node scripts/addProviderCompletedColumn.js
 *
 * Safe to re-run — skips if the column already exists.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mysql = require('mysql2/promise');
const dbConfig = require('../config/db.config');

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: dbConfig.HOST,
      port: dbConfig.PORT,
      user: dbConfig.USER,
      password: dbConfig.PASSWORD,
      database: dbConfig.DB
    });

    const [cols] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'quotes' AND COLUMN_NAME = 'providerCompleted'`,
      [dbConfig.DB]
    );

    if (cols.length) {
      console.log('Column quotes.providerCompleted already exists — nothing to do.');
    } else {
      await conn.query(
        'ALTER TABLE `quotes` ADD COLUMN `providerCompleted` TINYINT(1) NOT NULL DEFAULT 0'
      );
      console.log('Added column quotes.providerCompleted.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
