/*
 * One-time helper to drop the app's tables so Sequelize can recreate them
 * cleanly. Uses mysql2 directly (NOT Sequelize) so it works even when the
 * schema is in a broken state (e.g. service_types has > 64 stray indexes
 * and Sequelize's sync() refuses to run).
 *
 *   npm run db:reset
 *   npm start
 *
 * WARNING: drops every table managed by this app. Use only in dev.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const dbConfig = require('../config/db.config');

const TABLES = ['open_house', 'service_types', 'users'];

(async () => {
  let conn;
  try {
    console.log(`Connecting to mysql://${dbConfig.USER}@${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`);
    conn = await mysql.createConnection({
      host: dbConfig.HOST,
      port: dbConfig.PORT,
      user: dbConfig.USER,
      password: dbConfig.PASSWORD,
      database: dbConfig.DB,
      multipleStatements: false
    });

    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of TABLES) {
      process.stdout.write(`  DROP TABLE IF EXISTS \`${t}\`  …  `);
      await conn.query(`DROP TABLE IF EXISTS \`${t}\``);
      console.log('ok');
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\nAll target tables dropped. Now run:  npm start');
    console.log('(safe-sync will recreate them fresh with the correct indexes.)');
    process.exit(0);
  } catch (err) {
    console.error('Reset failed:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
