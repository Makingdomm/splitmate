// =============================================================================
// migrate.js — Auto-migration runner
// Runs pending SQL migrations on startup if DATABASE_URL is set
// =============================================================================

import pg from 'pg';
import { config } from '../config/index.js';

const { Client } = pg;

const MIGRATIONS = [
  {
    name: 'ton_pending_payments',
    sql: `
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
          SELECT 1 FROM pg_policies 
          WHERE tablename = 'ton_pending_payments' AND policyname = 'service_role_all'
        ) THEN
          CREATE POLICY "service_role_all" ON ton_pending_payments
            FOR ALL TO service_role USING (true) WITH CHECK (true);
        END IF;
      END $$;
    `,
  },
];

export async function runMigrations() {
  const dbUrl = config.DATABASE_URL;
  if (!dbUrl) {
    console.log('[migrate] No DATABASE_URL set, skipping migrations');
    return;
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('[migrate] Connected to database');

    for (const migration of MIGRATIONS) {
      try {
        await client.query(migration.sql);
        console.log(`[migrate] ✅ ${migration.name} — OK`);
      } catch (err) {
        console.error(`[migrate] ❌ ${migration.name} — ${err.message}`);
      }
    }
  } catch (err) {
    console.error('[migrate] Connection failed:', err.message);
  } finally {
    await client.end().catch(() => {});
  }
}
