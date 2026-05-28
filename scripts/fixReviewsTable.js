/**
 * Migrates the legacy `reviews` table to the current Review model schema.
 *
 * Legacy schema:  reviewerId, customerName (NOT NULL), project, helpfulCount
 * Current model:  userId, title, comment
 *
 * Safe DB sync never ALTERs existing tables, so the new columns were missing.
 * This script:
 *   1. adds `userId`  and backfills it from `reviewerId`
 *   2. adds `title`   and backfills it from `project`
 *   3. makes `customerName` nullable so inserts that omit it succeed
 *
 * Idempotent — safe to run multiple times. Legacy columns are kept (harmless).
 */
const mysql = require('mysql2/promise');

const DB = { host: 'localhost', user: 'root', password: '', database: 'reproserve' };

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [DB.database, table, column]
  );
  return rows.length > 0;
}

(async () => {
  const conn = await mysql.createConnection(DB);
  try {
    const hasUserId = await columnExists(conn, 'reviews', 'userId');
    const hasReviewerId = await columnExists(conn, 'reviews', 'reviewerId');
    const hasTitle = await columnExists(conn, 'reviews', 'title');
    const hasProject = await columnExists(conn, 'reviews', 'project');
    const hasCustomerName = await columnExists(conn, 'reviews', 'customerName');

    // 1. userId
    if (!hasUserId) {
      await conn.query('ALTER TABLE reviews ADD COLUMN userId INT NULL AFTER providerId');
      console.log('[+] added column reviews.userId');
      if (hasReviewerId) {
        const [r] = await conn.query('UPDATE reviews SET userId = reviewerId WHERE userId IS NULL');
        console.log(`    backfilled userId from reviewerId (${r.affectedRows} rows)`);
      }
    } else {
      console.log('[=] reviews.userId already exists — skipped');
    }

    // 2. title
    if (!hasTitle) {
      await conn.query('ALTER TABLE reviews ADD COLUMN title VARCHAR(150) NULL');
      console.log('[+] added column reviews.title');
      if (hasProject) {
        const [r] = await conn.query('UPDATE reviews SET title = project WHERE title IS NULL');
        console.log(`    backfilled title from project (${r.affectedRows} rows)`);
      }
    } else {
      console.log('[=] reviews.title already exists — skipped');
    }

    // 3. customerName -> nullable (model never supplies it)
    if (hasCustomerName) {
      await conn.query('ALTER TABLE reviews MODIFY customerName VARCHAR(100) NULL');
      console.log('[~] reviews.customerName is now nullable');
    }

    // 4. enforce NOT NULL on userId if no NULLs remain
    const [[{ nulls }]] = await conn.query('SELECT COUNT(*) AS nulls FROM reviews WHERE userId IS NULL');
    if (nulls === 0) {
      await conn.query('ALTER TABLE reviews MODIFY userId INT NOT NULL');
      console.log('[~] reviews.userId is now NOT NULL');
    } else {
      console.log(`[!] ${nulls} rows have NULL userId — left nullable`);
    }

    const [final] = await conn.query('DESCRIBE reviews');
    console.table(final.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null })));
    console.log('Done.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
