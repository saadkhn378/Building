import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Supabase and Postgres connection configuration
const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err.message);
});

export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && duration > 500) {
      console.warn(`[DB] Slow query (${duration}ms):`, text);
    }
    return res;
  } catch (error) {
    console.error('[DB Query Error]:', { text, error: error.message });
    throw error;
  }
};

export const getClient = async () => {
  return await pool.connect();
};

export const checkDbConnection = async () => {
  try {
    const res = await pool.query('SELECT NOW() as current_time');
    console.log('[DB] PostgreSQL connected successfully at:', res.rows[0].current_time);
    return true;
  } catch (err) {
    console.warn('[DB WARNING] Could not connect to PostgreSQL:', err.message);
    console.warn('[DB NOTE] Set DATABASE_URL in backend/.env to your Supabase PostgreSQL connection string to persist data.');
    return false;
  }
};
