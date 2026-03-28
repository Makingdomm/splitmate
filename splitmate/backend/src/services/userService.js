// =============================================================================
// services/userService.js — User CRUD and Pro subscription logic
// =============================================================================

import { query } from '../db/client.js';

// ─────────────────────────────────────────────────────────────────────────────
// upsertUser — Create or update a user from Telegram initData
// Called every time a user opens the Mini App or interacts with the bot
// ─────────────────────────────────────────────────────────────────────────────
export const upsertUser = async ({ telegram_id, username, full_name, photo_url }) => {
  const result = await query(
    `INSERT INTO users (telegram_id, username, full_name, photo_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (telegram_id)
     DO UPDATE SET
       username  = EXCLUDED.username,
       full_name = EXCLUDED.full_name,
       photo_url = EXCLUDED.photo_url,
       updated_at = NOW()
     RETURNING *`,
    [telegram_id, username, full_name, photo_url]
  );
  return result.rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// getUserByTelegramId — Fetch a single user record
// ─────────────────────────────────────────────────────────────────────────────
export const getUserByTelegramId = async (telegramId) => {
  const result = await query(
    'SELECT * FROM users WHERE telegram_id = $1',
    [telegramId]
  );
  return result.rows[0] || null;
};

// ─────────────────────────────────────────────────────────────────────────────
// isProUser — Check if user has an active Pro subscription
// ─────────────────────────────────────────────────────────────────────────────
export const isProUser = async (telegramId) => {
  const result = await query(
    `SELECT pro_status, pro_expires_at FROM users
     WHERE telegram_id = $1`,
    [telegramId]
  );
  const user = result.rows[0];
  if (!user) return false;
  if (!user.pro_status) return false;
  // Check expiry — if expires_at is null, it's lifetime Pro
  if (user.pro_expires_at && new Date(user.pro_expires_at) < new Date()) {
    // Subscription expired — downgrade automatically
    await query(
      'UPDATE users SET pro_status = FALSE WHERE telegram_id = $1',
      [telegramId]
    );
    return false;
  }
  return true;
};

// ─────────────────────────────────────────────────────────────────────────────
// activateProSubscription — Called after successful Stars payment
// Sets pro_status = true and extends expiry by 30 days
// ─────────────────────────────────────────────────────────────────────────────
export const activateProSubscription = async (telegramId) => {
  const result = await query(
    `UPDATE users
     SET
       pro_status     = TRUE,
       pro_expires_at = NOW() + INTERVAL '30 days',
       updated_at     = NOW()
     WHERE telegram_id = $1
     RETURNING *`,
    [telegramId]
  );
  return result.rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// updateTonWallet — Save user's connected TON wallet address
// ─────────────────────────────────────────────────────────────────────────────
export const updateTonWallet = async (telegramId, walletAddress) => {
  const result = await query(
    `UPDATE users SET ton_wallet = $2, updated_at = NOW()
     WHERE telegram_id = $1
     RETURNING *`,
    [telegramId, walletAddress]
  );
  return result.rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// countUserGroups — How many groups is this user a member of?
// Used to enforce free tier limit of 3 groups
// ─────────────────────────────────────────────────────────────────────────────
export const countUserGroups = async (telegramId) => {
  const result = await query(
    `SELECT COUNT(*) FROM group_members
     WHERE user_id = $1`,
    [telegramId]
  );
  return parseInt(result.rows[0].count, 10);
};
