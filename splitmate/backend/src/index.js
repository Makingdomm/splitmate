// =============================================================================
// index.js — Main application entry point
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
import tonRoutes     from './api/ton.js';
import commentRoutes from './api/comments.js';
import cron from 'node-cron';
import { sendDebtReminders } from './bot/reminders.js';
import { processRecurringExpenses } from './services/recurringService.js';
import { runMigrations } from './db/migrate.js';

const fastify = Fastify({
  logger: config.NODE_ENV === 'development',
  trustProxy: true,
});

fastify.setErrorHandler((err, req, reply) => {
  console.error(`[ERROR] ${req.method} ${req.url}:`, err.message);
  if (err.validation) return reply.code(400).send({ error: 'VALIDATION_ERROR', message: err.message });
  if (err.statusCode === 429) return reply.code(429).send({ error: 'TOO_MANY_REQUESTS', message: 'Too many requests. Please slow down.' });
  const statusCode = err.statusCode || 500;
  reply.code(statusCode).send({
    error: statusCode === 500 ? 'INTERNAL_ERROR' : err.code || 'ERROR',
    message: statusCode === 500 ? 'An internal error occurred' : err.message,
  });
});

await fastify.register(cors, {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const allowed = [config.MINI_APP_URL, 'https://web.telegram.org', 'https://webk.telegram.org', 'https://webz.telegram.org'];
    const isAllowed =
      allowed.some(u => origin === u || origin.startsWith(u)) ||
      /https:\/\/frontend.*vercel\.app$/.test(origin) ||
      /https:\/\/.*\.vercel\.app$/.test(origin);
    cb(null, isAllowed);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-telegram-init-data'],
  credentials: false,
});

await fastify.register(helmet, { contentSecurityPolicy: false });

await fastify.register(rateLimit, {
  max: 120,
  timeWindow: '1 minute',
  keyGenerator: (req) => {
    const initData = req.headers['x-telegram-init-data'] || '';
    const match = initData.match(/user=%7B%22id%22%3A(\d+)/);
    return match ? `user_${match[1]}` : req.ip;
  },
  errorResponseBuilder: () => ({ error: 'TOO_MANY_REQUESTS', message: 'Too many requests. Please slow down.' }),
});

fastify.get('/health', async () => ({ status: 'ok', version: '1.2.0', timestamp: new Date().toISOString() }));

fastify.post(
  `/webhook/${config.BOT_SECRET}`,
  { preHandler: webhookMiddleware },
  async (req, reply) => {
    try { await bot.handleUpdate(req.body); return reply.code(200).send({ ok: true }); }
    catch (err) { console.error('Webhook handling error:', err); return reply.code(200).send({ ok: false }); }
  }
);

fastify.register(async (instance) => {
  instance.addHook('preHandler', authMiddleware);
  instance.register(groupRoutes,   { prefix: '/api/groups' });
  instance.register(expenseRoutes, { prefix: '/api/expenses' });
  instance.register(paymentRoutes, { prefix: '/api/payments' });
  instance.register(receiptRoutes, { prefix: '/api/receipts' });
  instance.register(walletRoutes,  { prefix: '/api/wallets' });
  instance.register(tonRoutes,     { prefix: '/api/ton' });
  instance.register(commentRoutes, { prefix: '/api/comments' });
  instance.register((await import('./api/admin.js')).default, { prefix: '/api/admin' });
});

// ── Daily debt reminders at 10:00 AM UTC
cron.schedule('0 10 * * *', async () => {
  try { console.log('[CRON] Running daily debt reminders...'); await sendDebtReminders(); }
  catch (err) { console.error('[CRON] Reminder job failed:', err); }
});

// ── Recurring expenses: run at 08:00 AM UTC every day
cron.schedule('0 8 * * *', async () => {
  try { console.log('[CRON] Processing recurring expenses...'); await processRecurringExpenses(); }
  catch (err) { console.error('[CRON] Recurring job failed:', err); }
});

fastify.post('/api/admin/trigger-reminders', async (req, reply) => {
  const secret = req.headers['x-admin-secret'];
  if (secret !== config.BOT_SECRET) return reply.code(401).send({ error: 'Unauthorized' });
  await sendDebtReminders();
  return { success: true, message: 'Reminders triggered' };
});

fastify.post('/admin/run-migration', async (req, reply) => {
  const secret = req.headers['x-admin-secret'];
  if (secret !== process.env.BOT_SECRET) return reply.code(403).send({ error: 'Forbidden' });
  try {
    const { default: postgres } = await import('postgres');
    const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_tier TEXT DEFAULT 'standard'`;
    const result = await sql`
      UPDATE users SET pro_tier = 'elite', pro_status = true, pro_expires_at = '2099-12-31 23:59:59+00'
      WHERE telegram_id = 646401564
      RETURNING username, pro_tier, pro_expires_at
    `;
    await sql.end();
    return reply.send({ ok: true, updated: result });
  } catch (e) { return reply.code(500).send({ error: e.message }); }
});

const shutdown = async (signal) => {
  console.log(`[SHUTDOWN] Received ${signal}, closing server...`);
  try { await fastify.close(); console.log('[SHUTDOWN] Server closed cleanly'); process.exit(0); }
  catch (err) { console.error('[SHUTDOWN] Error during shutdown:', err); process.exit(1); }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => { console.error('[UNCAUGHT EXCEPTION]', err); });
process.on('unhandledRejection', (reason) => { console.error('[UNHANDLED REJECTION]', reason); });

const start = async () => {
  try {
    await runMigrations();
    const webhookUrl = `${config.APP_URL}/webhook/${config.BOT_SECRET}`;
    await bot.telegram.setWebhook(webhookUrl, {
      secret_token: config.BOT_SECRET,
      allowed_updates: ['message', 'callback_query', 'pre_checkout_query', 'my_chat_member', 'inline_query'],
    });
    console.log(`✅ Webhook set: ${webhookUrl}`);
    await fastify.listen({ port: config.PORT, host: '0.0.0.0' });
    console.log(`🚀 SplitMate backend running on port ${config.PORT}`);
    console.log(`🌍 Environment: ${config.NODE_ENV}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
