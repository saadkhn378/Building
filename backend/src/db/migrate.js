import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('[Migration] Starting database migration...');
  const sqlPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('[Migration] Database schema migrated successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Migration Error]:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
