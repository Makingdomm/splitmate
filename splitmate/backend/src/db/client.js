// =============================================================================
// db/client.js — Supabase JS client (HTTPS-based, IPv4 compatible)
// Wraps @supabase/supabase-js with a pg-compatible query interface
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

const PROJECT_REF = config.SUPABASE_PROJECT_REF;
const SERVICE_KEY = config.SUPABASE_SERVICE_KEY;

export const supabase = createClient(
  `https://${PROJECT_REF}.supabase.co`,
  SERVICE_KEY,
  { auth: { persistSession: false } }
);

// ─────────────────────────────────────────────────────────────────────────────
// query — PostgREST raw SQL via pg_rpc (service_role bypasses RLS)
// Compatible with existing code that uses query(text, params)
// ─────────────────────────────────────────────────────────────────────────────
export const query = async (text, params = []) => {
  // Build the query with params substituted
  let sql = text;
  if (params.length > 0) {
    params.forEach((p, i) => {
      const val = typeof p === 'string' ? `'${p.replace(/'/g, "''")}'`
                : p === null ? 'NULL'
                : p;
      sql = sql.replace(`$${i + 1}`, val);
    });
  }

  const res = await fetch(
    `https://${PROJECT_REF}.supabase.co/rest/v1/rpc/run_query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ sql }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error('DB query error:', { text: text.slice(0, 80), error: err });
    throw new Error(err);
  }

  const rows = await res.json();
  return { rows: Array.isArray(rows) ? rows : [rows], rowCount: Array.isArray(rows) ? rows.length : 1 };
};

export const transaction = async (callback) => {
  return await callback({ query });
};

export default supabase;
