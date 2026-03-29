-- =============================================================================
-- Migration: Add multi-chain crypto wallet support
-- Run in Supabase SQL editor
-- =============================================================================

-- 1. Add crypto_wallets JSONB column to users
--    Format: [{ "chain": "TON", "address": "EQ...", "label": "My Wallet" }, ...]
ALTER TABLE users ADD COLUMN IF NOT EXISTS crypto_wallets JSONB DEFAULT '[]'::jsonb;

-- 2. Extend settlements to support more methods and pending state
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS crypto_chain VARCHAR(20);  -- 'TON','ETH','BTC','USDT','SOL'

-- settlements.method already supports any string — we'll use: 'ton','eth','btc','usdt_trc20','usdt_erc20','sol','manual'

-- 3. Update settlements status to include 'pending' (sender says paid, receiver confirms)
-- status column already exists as VARCHAR(20) — just add 'pending_confirmation' as valid value
-- (handled in app logic, no schema change needed)

-- 4. Add opt-out flag for reminders (used by reminders.js)
ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_opt_out BOOLEAN DEFAULT FALSE;

-- Index for wallet lookups
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
