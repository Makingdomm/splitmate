// =============================================================================
// db/client.js — Supabase JS client (HTTPS-based, IPv4 compatible)
// Replaces direct pg connection — works on Railway without IPv6
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

const supabaseUrl = `https://${config.SUPABASE_PROJECT_REF}.supabase.co`;
const supabaseKey = config.SUPABASE_SERVICE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  db: { schema: 'public' },
});

// ─────────────────────────────────────────────────────────────────────────────
// rawQuery — execute raw SQL via PostgREST /rpc/run_sql (service_role only)
// ─────────────────────────────────────────────────────────────────────────────
const rawQuery = async (sql) => {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/run_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SQL error: ${err}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

// ─────────────────────────────────────────────────────────────────────────────
// query — pg-compatible wrapper. Safely inlines $1...$N params.
// ─────────────────────────────────────────────────────────────────────────────
export const query = async (text, params = []) => {
  let sql = text;
  if (params.length > 0) {
    params.forEach((p, i) => {
      let val;
      if (p === null || p === undefined) val = 'NULL';
      else if (typeof p === 'boolean')   val = p ? 'TRUE' : 'FALSE';
      else if (typeof p === 'number')    val = String(p);
      else if (p instanceof Date)        val = `'${p.toISOString()}'`;
      else val = `'${String(p).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
      sql = sql.replace(new RegExp(`\\$${i + 1}(?!\\d)`, 'g'), val);
    });
  }

  try {
    const rows = await rawQuery(sql);
    return { rows, rowCount: rows.length };
  } catch (err) {
    console.error('DB query error:', { text: text.slice(0, 80), error: err.message });
    throw err;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// transaction — sequential (no true atomic TX over REST, but handles most cases)
// ─────────────────────────────────────────────────────────────────────────────
export const transaction = async (callback) => {
  return await callback({ query });
};

export default supabase;
