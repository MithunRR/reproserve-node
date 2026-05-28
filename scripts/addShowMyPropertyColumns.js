/**
 * Adds the lifecycle columns needed by the full Show-My-Property flow.
 *
 *   title            VARCHAR(255)  — human-readable label for the listing
 *   payoutPerHour    DECIMAL(10,2) — what the customer offers per hour
 *   preferredDateTo  DATE          — end of the customer's availability window
 *   assignedAgentId  INT           — realtor who claimed the showing
 *   assignedAt       DATETIME      — when the realtor claimed it
 *   completedAt      DATETIME      — when the realtor marked it done
 *
 * Idempotent — safe to run multiple times. Safe-mode Sequelize sync never
 * ALTERs existing tables, so we apply these by hand.
 */
const mysql = require('mysql2/promise');

const DB = { host: 'localhost', user: 'root', password: '', database: 'reproserve' };
const TABLE = 'show_my_property_requests';

async function columnExists(conn, column) {
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [DB.database, TABLE, column]
  );
  return rows.length > 0;
}

async function addColumn(conn, name, ddl) {
  if (await columnExists(conn, name)) {
    console.log(`[=] ${TABLE}.${name} already exists — skipped`);
    return;
  }
  await conn.query(`ALTER TABLE ${TABLE} ADD COLUMN ${ddl}`);
  console.log(`[+] added column ${TABLE}.${name}`);
}

(async () => {
  const conn = await mysql.createConnection(DB);
  try {
    await addColumn(conn, 'title',           'title VARCHAR(255) NULL AFTER propertyType');
    await addColumn(conn, 'payoutPerHour',   'payoutPerHour DECIMAL(10,2) NULL AFTER price');
    await addColumn(conn, 'preferredDateTo', 'preferredDateTo DATE NULL AFTER preferredDate');
    await addColumn(conn, 'assignedAgentId', 'assignedAgentId INT NULL AFTER status');
    await addColumn(conn, 'assignedAt',      'assignedAt DATETIME NULL AFTER assignedAgentId');
    await addColumn(conn, 'completedAt',     'completedAt DATETIME NULL AFTER assignedAt');

    const [desc] = await conn.query(`DESCRIBE ${TABLE}`);
    console.table(desc.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null })));
    console.log('Done.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
