import pg from 'pg';
const { Client } = pg;

const sql = `
CREATE TABLE IF NOT EXISTS ton_pending_payments (
  id            BIGSERIAL PRIMARY KEY,
  telegram_id   BIGINT NOT NULL UNIQUE,
  tier          TEXT NOT NULL CHECK (tier IN ('standard','elite')),
  comment       TEXT NOT NULL,
  ton_amount    DECIMAL(12,6) NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','expired')),
  expires_at    TIMESTAMPTZ NOT NULL,
  tx_hash       TEXT,
  sent_ton      DECIMAL(12,6),
  confirmed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ton_payments_telegram_id ON ton_pending_payments(telegram_id);
CREATE INDEX IF NOT EXISTS idx_ton_payments_status ON ton_pending_payments(status);

ALTER TABLE ton_pending_payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ton_pending_payments' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY "service_role_all" ON ton_pending_payments
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE ton_pending_payments IS 'Tracks pending and completed TON payments for Pro upgrades';
`;

const client = new Client({
  connectionString: process.env.DB_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  console.log('Connecting to Supabase...');
  await client.connect();
  console.log('Connected! Running migration...');
  await client.query(sql);
  console.log('✅ Migration complete! ton_pending_payments table created.');
  
  // Verify
  const result = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'ton_pending_payments' 
    ORDER BY ordinal_position
  `);
  console.log('\nTable columns:');
  result.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
  
} catch (err) {
  console.error('❌ Migration failed:', err.message);
} finally {
  await client.end();
}
