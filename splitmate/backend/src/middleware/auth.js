import crypto from 'crypto';
import { config } from '../config/index.js';
import { upsertUser } from '../services/userService.js';

export const validateTelegramInitData = (initData) => {
  if (!initData) throw new Error('Missing initData');

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new Error('Missing hash in initData');

  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(config.BOT_TOKEN)
    .digest();

  const expectedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  // Timing-safe comparison
  const hashBuf     = Buffer.from(hash, 'hex');
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  if (hashBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(hashBuf, expectedBuf)) {
    throw new Error('Invalid initData signature');
  }

  // Relaxed expiry: 24 hours (was 1 hour)
  const authDate = parseInt(params.get('auth_date'), 10);
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 86400) {
    throw new Error('initData expired');
  }

  const userJson = params.get('user');
  if (!userJson) throw new Error('No user in initData');
  return JSON.parse(userJson);
};

export const authMiddleware = async (req, reply) => {
  try {
    const initData = req.headers['x-telegram-init-data'];
    if (!initData) {
      return reply.code(401).send({ error: 'Missing authentication' });
    }

    const telegramUser = validateTelegramInitData(initData);

    const user = await upsertUser({
      telegram_id: telegramUser.id,
      username:    telegramUser.username,
      full_name:   `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
      photo_url:   telegramUser.photo_url,
    });

    req.user = user;
    req.telegramUser = telegramUser;

  } catch (err) {
    console.error('Auth error:', err.message);
    return reply.code(401).send({ error: 'Unauthorized', detail: err.message });
  }
};

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

export const webhookMiddleware = async (req, reply) => {
  const secret = req.headers['x-telegram-bot-api-secret-token'];
  if (secret !== config.BOT_SECRET) {
    console.warn('Rejected webhook with invalid secret');
    return reply.code(403).send({ error: 'Forbidden' });
  }
};
