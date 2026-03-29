-- Migration: TON payment tracking
-- Run this in Supabase SQL editor

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

-- RLS
ALTER TABLE ton_pending_payments ENABLE ROW LEVEL SECURITY;

-- Service role can read/write everything (backend uses service key)
CREATE POLICY "service_role_all" ON ton_pending_payments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE ton_pending_payments IS 'Tracks pending and completed TON payments for Pro upgrades';
