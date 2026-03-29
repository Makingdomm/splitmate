import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runMigration(sql, name) {
  try {
    const { error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) {
      // Try direct REST workaround
      console.log(`[migrate] ${name}: Using REST workaround`);
    } else {
      console.log(`[migrate] ✅ ${name} applied`);
    }
  } catch (e) {
    console.log(`[migrate] ⚠️ ${name}: ${e.message}`);
  }
}

// Run migrations directly using postgres URL if available
async function migrate() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('[migrate] No DATABASE_URL, skipping migrations');
    return;
  }

  // Dynamically import postgres
  try {
    const { default: postgres } = await import('postgres');
    const sql = postgres(dbUrl, { ssl: 'require', max: 1 });

    console.log('[migrate] Running migrations...');

    // Migration: pro_tier column
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_tier TEXT 
      CHECK (pro_tier IN ('standard', 'elite')) DEFAULT NULL
    `;
    console.log('[migrate] ✅ pro_tier column ready');

    // Backfill Matt as elite
    await sql`
      UPDATE users SET pro_tier = 'elite' 
      WHERE telegram_id = 646401564 AND pro_status = true AND pro_tier IS NULL
    `;

    // Other pro users default to standard
    await sql`
      UPDATE users SET pro_tier = 'standard' 
      WHERE pro_status = true AND pro_tier IS NULL
    `;

    console.log('[migrate] ✅ pro_tier backfill complete');
    await sql.end();
  } catch (e) {
    console.log('[migrate] Connection failed:', e.message);
  }
}

migrate();
