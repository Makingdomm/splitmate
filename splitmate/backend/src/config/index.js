import dotenv from 'dotenv';
dotenv.config();

const required = (key) => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
};

const optional = (key, fallback = '') => process.env[key] || fallback;

export const config = {
  PORT:     parseInt(optional('PORT', '3000'), 10),
  NODE_ENV: optional('NODE_ENV', 'development'),
  APP_URL:  required('APP_URL'),

  // Telegram
  BOT_TOKEN:    required('BOT_TOKEN'),
  BOT_SECRET:   required('BOT_SECRET'),
  MINI_APP_URL: required('MINI_APP_URL'),

  // Supabase (new — HTTP-based connection)
  SUPABASE_PROJECT_REF: optional('SUPABASE_PROJECT_REF', 'ikcnjzqoaebczfojqdsg'),
  SUPABASE_SERVICE_KEY: required('SUPABASE_SERVICE_KEY'),

  // Keep DATABASE_URL optional (legacy)
  DATABASE_URL: optional('DATABASE_URL', ''),

  // Optional extras
  REDIS_URL:              optional('REDIS_URL', ''),
  REDIS_TOKEN:            optional('REDIS_TOKEN', ''),
  OPENAI_API_KEY:         optional('OPENAI_API_KEY', ''),
  EXCHANGE_RATES_API_KEY: optional('EXCHANGE_RATES_API_KEY', ''),
  PRO_MONTHLY_STARS:      parseInt(optional('PRO_MONTHLY_STARS', '500'), 10),
  TON_FEE_PERCENT:        parseFloat(optional('TON_FEE_PERCENT', '0.5')),
};
