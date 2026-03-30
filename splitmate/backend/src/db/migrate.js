// Run migrations directly using postgres URL if available
export async function runMigrations() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('[migrate] No DATABASE_URL, skipping migrations');
    return;
  }

  try {
    const { default: postgres } = await import('postgres');
    const sql = postgres(dbUrl, { ssl: 'require', max: 1 });

    console.log('[migrate] Running migrations...');

    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_tier TEXT 
      CHECK (pro_tier IN ('standard', 'elite')) DEFAULT NULL
    `;
    console.log('[migrate] ✅ pro_tier column ready');

    await sql`
      UPDATE users SET pro_tier = 'elite' 
      WHERE telegram_id = 646401564 AND pro_status = true AND pro_tier IS NULL
    `;

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
