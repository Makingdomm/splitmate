// =============================================================================
// middleware/auth.js — Telegram Mini App initData validation
// CRITICAL: Always validate initData before trusting any user identity claim
// Telegram signs the initData with HMAC-SHA256 using the bot token as key
//
// Docs: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// =============================================================================

import crypto from 'crypto';
import { config } from '../config/index.js';
import { upsertUser } from '../services/userService.js';

// ─────────────────────────────────────────────────────────────────────────────
// validateTelegramInitData — Verify the HMAC signature from Telegram
// Returns the parsed user object if valid, throws if invalid
// ─────────────────────────────────────────────────────────────────────────────
export const validateTelegramInitData = (initData) => {
  if (!initData) throw new Error('Missing initData');

  // Parse the URL-encoded initData string
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new Error('Missing hash in initData');

  // Remove hash from params before verification
  params.delete('hash');

  // Sort parameters alphabetically and join as key=value\n
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  // Create HMAC key: HMAC-SHA256("WebAppData", bot_token)
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(config.BOT_TOKEN)
    .digest();

  // Compute expected hash
  const expectedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  // Timing-safe comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(expectedHash, 'hex')
  )) {
    throw new Error('Invalid initData signature');
  }

  // Check timestamp freshness (reject data older than 1 hour)
  const authDate = parseInt(params.get('auth_date'), 10);
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 3600) {
    throw new Error('initData expired');
  }

  // Parse and return the user object
  const userJson = params.get('user');
  if (!userJson) throw new Error('No user in initData');
  return JSON.parse(userJson);
};

// ─────────────────────────────────────────────────────────────────────────────
// authMiddleware — Fastify preHandler that validates every API request
// Attaches req.user to all downstream route handlers
// ─────────────────────────────────────────────────────────────────────────────
export const authMiddleware = async (req, reply) => {
  try {
    const initData = req.headers['x-telegram-init-data'];
    if (!initData) {
      return reply.code(401).send({ error: 'Missing authentication' });
    }

    // Validate and extract Telegram user
    const telegramUser = validateTelegramInitData(initData);

    // Upsert user into DB (create if new, update name/photo if changed)
    const user = await upsertUser({
      telegram_id: telegramUser.id,
      username:    telegramUser.username,
      full_name:   `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
      photo_url:   telegramUser.photo_url,
    });

    // Attach to request for downstream use
    req.user = user;
    req.telegramUser = telegramUser;

  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return reply.code(401).send({ error: 'Unauthorized', detail: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// proGuard — Middleware to enforce Pro subscription on protected routes
// Use after authMiddleware
// ─────────────────────────────────────────────────────────────────────────────
export const proGuard = async (req, reply) => {
  const { isProUser } = await import('../services/userService.js');
  const isPro = await isProUser(req.user.telegram_id);
  if (!isPro) {
    return reply.code(403).send({
      error: 'PRO_REQUIRED',
      message: 'This feature requires SplitMate Pro. Upgrade with /upgrade',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// webhookMiddleware — Validates Telegram bot webhook requests
// Uses the secret token we set when registering the webhook
// ─────────────────────────────────────────────────────────────────────────────
export const webhookMiddleware = async (req, reply) => {
  const secret = req.headers['x-telegram-bot-api-secret-token'];
  if (secret !== config.BOT_SECRET) {
    console.warn('Rejected webhook with invalid secret');
    return reply.code(403).send({ error: 'Forbidden' });
  }
};
