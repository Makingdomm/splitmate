-- =============================================================================
-- schema.sql — Full PostgreSQL database schema for SplitMate
-- Run this once against your Supabase project via the SQL editor
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- USERS
-- Stores every Telegram user who has interacted with SplitMate
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id     BIGINT UNIQUE NOT NULL,       -- Telegram user ID
  username        VARCHAR(255),                  -- @handle (can be null)
  full_name       VARCHAR(255) NOT NULL,         -- First + last name
  photo_url       TEXT,                          -- Telegram profile photo
  pro_status      BOOLEAN DEFAULT FALSE,         -- Is Pro subscriber?
  pro_expires_at  TIMESTAMPTZ,                   -- Pro expiry date
  ton_wallet      VARCHAR(255),                  -- Connected TON wallet address
  preferred_currency VARCHAR(3) DEFAULT 'USD',   -- User's default currency
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUPS
-- A SplitMate expense group (maps 1:1 or 1:many to Telegram groups)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS groups (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  created_by      BIGINT NOT NULL REFERENCES users(telegram_id),
  telegram_chat_id BIGINT,                       -- Linked Telegram group chat ID (optional)
  currency        VARCHAR(3) DEFAULT 'USD',       -- Default group currency
  invite_code     VARCHAR(20) UNIQUE NOT NULL,    -- Short code for deep-link invites
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP MEMBERS
-- Junction table: users <-> groups
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_members (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id  UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id   BIGINT NOT NULL REFERENCES users(telegram_id),
  role      VARCHAR(20) DEFAULT 'member',        -- 'admin' | 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- EXPENSES
-- A single shared expense logged by a user
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  paid_by       BIGINT NOT NULL REFERENCES users(telegram_id),
  amount        DECIMAL(12, 2) NOT NULL,          -- Amount in original currency
  currency      VARCHAR(3) NOT NULL DEFAULT 'USD',
  amount_usd    DECIMAL(12, 2),                   -- Normalized to USD for calculations
  description   VARCHAR(500) NOT NULL,
  category      VARCHAR(50) DEFAULT 'general',    -- food, transport, accommodation, etc.
  split_type    VARCHAR(20) DEFAULT 'equal',      -- 'equal' | 'custom' | 'percentage'
  receipt_url   TEXT,                             -- S3/storage URL for receipt photo
  is_recurring  BOOLEAN DEFAULT FALSE,
  recur_interval VARCHAR(20),                     -- 'weekly' | 'monthly'
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- EXPENSE SPLITS
-- How each expense is divided among group members
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expense_splits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id  UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(telegram_id),
  amount_owed DECIMAL(12, 2) NOT NULL,            -- What this user owes for this expense
  is_settled  BOOLEAN DEFAULT FALSE,
  settled_at  TIMESTAMPTZ,
  UNIQUE(expense_id, user_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SETTLEMENTS
-- Records of debt payments between users (manual or TON on-chain)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settlements (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  from_user_id  BIGINT NOT NULL REFERENCES users(telegram_id),
  to_user_id    BIGINT NOT NULL REFERENCES users(telegram_id),
  amount        DECIMAL(12, 2) NOT NULL,
  currency      VARCHAR(3) DEFAULT 'USD',
  method        VARCHAR(20) DEFAULT 'manual',     -- 'manual' | 'ton' | 'stars'
  tx_hash       TEXT,                             -- TON blockchain tx hash
  fee_charged   DECIMAL(12, 6) DEFAULT 0,         -- Platform fee on TON settlements
  status        VARCHAR(20) DEFAULT 'completed',  -- 'pending' | 'completed' | 'failed'
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STAR PAYMENTS
-- Tracks Telegram Stars subscription payments
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS star_payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id     BIGINT NOT NULL REFERENCES users(telegram_id),
  telegram_charge_id TEXT UNIQUE NOT NULL,        -- Telegram's payment charge ID
  stars_amount    INTEGER NOT NULL,               -- How many Stars were paid
  payload         TEXT,                           -- Our invoice payload
  status          VARCHAR(20) DEFAULT 'completed',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES for performance
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id ON expense_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_settlements_group_id ON settlements(group_id);
CREATE INDEX IF NOT EXISTS idx_settlements_from_user ON settlements(from_user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_to_user ON settlements(to_user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATED_AT trigger function
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
