// =============================================================================
// config/index.js — Centralized configuration loader
// All env vars validated at startup so the app fails fast if misconfigured
// =============================================================================

import dotenv from 'dotenv';
dotenv.config();

const required = (key) => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
};

const optional = (key, fallback = '') => process.env[key] || fallback;

export const config = {
  // ── Server ──────────────────────────────────────────────────────────────────
  PORT: parseInt(optional('PORT', '3000'), 10),
  NODE_ENV: optional('NODE_ENV', 'development'),
  APP_URL: required('APP_URL'), // e.g. https://splitmate.railway.app

  // ── Telegram ─────────────────────────────────────────────────────────────
  BOT_TOKEN: required('BOT_TOKEN'),           // From @BotFather
  BOT_SECRET: required('BOT_SECRET'),         // Random string for webhook security
  MINI_APP_URL: required('MINI_APP_URL'),     // Vercel frontend URL

  // ── Database (Supabase / Postgres) ───────────────────────────────────────
  DATABASE_URL: required('DATABASE_URL'),

  // ── Redis (Upstash) ──────────────────────────────────────────────────────
  REDIS_URL: optional('REDIS_URL', ''),
  REDIS_TOKEN: optional('REDIS_TOKEN', ''),

  // ── OpenAI (Pro receipt OCR) ─────────────────────────────────────────────
  OPENAI_API_KEY: optional('OPENAI_API_KEY', ''),

  // ── Exchange Rates ───────────────────────────────────────────────────────
  EXCHANGE_RATES_API_KEY: optional('EXCHANGE_RATES_API_KEY', ''),

  // ── Telegram Stars Pro subscription price (in Stars) ─────────────────────
  PRO_MONTHLY_STARS: parseInt(optional('PRO_MONTHLY_STARS', '500'), 10),

  // ── TON settlement fee (percentage) ──────────────────────────────────────
  TON_FEE_PERCENT: parseFloat(optional('TON_FEE_PERCENT', '0.5')),
};
