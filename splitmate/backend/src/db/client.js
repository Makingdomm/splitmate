// =============================================================================
// db/client.js — PostgreSQL connection pool via pg
// Using a singleton pool pattern so we don't exhaust connections
// =============================================================================

import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;

// Create a single pool instance shared across the entire app
const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,                  // Max connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000,
});

// Log pool errors (don't crash the app on idle connection errors)
pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err);
});

// ─────────────────────────────────────────────────────────────────────────────
// query — Simple wrapper for parameterized queries
// Usage: await query('SELECT * FROM users WHERE telegram_id = $1', [userId])
// ─────────────────────────────────────────────────────────────────────────────
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (config.NODE_ENV === 'development') {
      console.log('DB query executed', { text: text.slice(0, 80), duration, rows: result.rowCount });
    }
    return result;
  } catch (err) {
    console.error('DB query error:', { text: text.slice(0, 80), error: err.message });
    throw err;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// transaction — Wraps multiple queries in a DB transaction
// Usage: await transaction(async (client) => { await client.query(...) })
// ─────────────────────────────────────────────────────────────────────────────
export const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export default pool;
