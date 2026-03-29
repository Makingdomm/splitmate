// =============================================================================
// index.js — Main application entry point
// Sets up Fastify server, registers all routes, and starts the bot webhook
// =============================================================================

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config/index.js';
import { bot } from './bot/commands.js';
import { authMiddleware, webhookMiddleware } from './middleware/auth.js';
import groupRoutes from './api/groups.js';
import expenseRoutes from './api/expenses.js';
import paymentRoutes from './api/payments.js';
import receiptRoutes from './api/receipts.js';
import walletRoutes  from './api/wallets.js';
import cron from 'node-cron';
import { sendDebtReminders } from './bot/reminders.js';

// ─────────────────────────────────────────────────────────────────────────────
// Create Fastify instance
// ─────────────────────────────────────────────────────────────────────────────
const fastify = Fastify({
  logger: config.NODE_ENV === 'development',
  trustProxy: true, // Required for Railway/Vercel deployments behind a proxy
});

// ─────────────────────────────────────────────────────────────────────────────
// Global plugins
// ─────────────────────────────────────────────────────────────────────────────

// CORS — allow requests from our Mini App frontend
await fastify.register(cors, {
  origin: (origin, cb) => {
    // Allow: no origin (server-to-server), Telegram web, our Mini App, Vercel previews
    if (!origin) return cb(null, true);
    const allowed = [
      config.MINI_APP_URL,
      'https://web.telegram.org',
    ];
    const isAllowed =
      allowed.some(u => origin === u || origin.startsWith(u)) ||
      /https:\/\/frontend.*vercel\.app$/.test(origin);
    cb(null, isAllowed);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-telegram-init-data'],
  credentials: false,
});

// Security headers
await fastify.register(helmet, {
  contentSecurityPolicy: false, // Mini Apps need this off for Telegram iframe
});

// Rate limiting — protect against abuse
await fastify.register(rateLimit, {
  max: 120,           // 120 requests per minute per IP
  timeWindow: '1 minute',
  keyGenerator: (req) => {
    // Use telegram_id from header for more accurate per-user limiting
    const initData = req.headers['x-telegram-init-data'] || '';
    const match = initData.match(/user=%7B%22id%22%3A(\d+)/);
    return match ? `user_${match[1]}` : req.ip;
  },
  errorResponseBuilder: () => ({
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many requests. Please slow down.',
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Health check — used by Railway to confirm the app is running
// ─────────────────────────────────────────────────────────────────────────────
fastify.get('/health', async () => ({
  status: 'ok',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Telegram Webhook — receives all bot updates
// POST /webhook/:secret — the secret in the URL provides basic security
// ─────────────────────────────────────────────────────────────────────────────
fastify.post(
  `/webhook/${config.BOT_SECRET}`,
  { preHandler: webhookMiddleware },
  async (req, reply) => {
    try {
      await bot.handleUpdate(req.body);
      return reply.code(200).send({ ok: true });
    } catch (err) {
      console.error('Webhook handling error:', err);
      // Always return 200 to Telegram — otherwise it will retry
      return reply.code(200).send({ ok: false });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// API Routes — all require authentication via Telegram initData
// ─────────────────────────────────────────────────────────────────────────────
fastify.register(async (instance) => {
  // Apply auth middleware to all /api/* routes
  instance.addHook('preHandler', authMiddleware);

  instance.register(groupRoutes,   { prefix: '/api/groups' });
  instance.register(expenseRoutes, { prefix: '/api/expenses' });
  instance.register(paymentRoutes, { prefix: '/api/payments' });
  instance.register(receiptRoutes, { prefix: '/api/receipts' });
  instance.register(walletRoutes,  { prefix: '/api/wallets' });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scheduled Jobs
// ─────────────────────────────────────────────────────────────────────────────

// Send debt reminders daily at 10:00 AM UTC
cron.schedule('0 10 * * *', async () => {
  try {
    await sendDebtReminders();
  } catch (err) {
    console.error('Reminder job failed:', err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin route — manual trigger for reminder job (protected by BOT_SECRET)
// ─────────────────────────────────────────────────────────────────────────────
fastify.post('/api/admin/trigger-reminders', async (req, reply) => {
  const secret = req.headers['x-admin-secret'];
  if (secret !== config.BOT_SECRET) return reply.code(401).send({ error: 'Unauthorized' });
  await sendDebtReminders();
  return { success: true, message: 'Reminders triggered' };
});

// ─────────────────────────────────────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    // Register webhook with Telegram
    const webhookUrl = `${config.APP_URL}/webhook/${config.BOT_SECRET}`;
    await bot.telegram.setWebhook(webhookUrl, {
      secret_token: config.BOT_SECRET,
      allowed_updates: [
        'message', 'callback_query', 'pre_checkout_query',
        'my_chat_member', 'inline_query'
      ],
    });
    console.log(`✅ Webhook set: ${webhookUrl}`);

    // Start the HTTP server
    await fastify.listen({ port: config.PORT, host: '0.0.0.0' });
    console.log(`🚀 SplitMate backend running on port ${config.PORT}`);
    console.log(`🌍 Environment: ${config.NODE_ENV}`);

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();

