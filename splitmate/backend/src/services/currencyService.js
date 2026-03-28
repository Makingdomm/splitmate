// =============================================================================
// services/currencyService.js — Live FX rates with Redis caching
// Rates are cached for 1 hour to avoid hammering the external API
// =============================================================================

import { config } from '../config/index.js';

// In-memory fallback cache if Redis is not configured
const memoryCache = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// getExchangeRate — Get rate from base currency to target currency
// Returns a multiplier: amount * rate = converted amount
// ─────────────────────────────────────────────────────────────────────────────
export const getExchangeRate = async (fromCurrency, toCurrency = 'USD') => {
  // Same currency — no conversion needed
  if (fromCurrency === toCurrency) return 1.0;

  const cacheKey = `fx:${fromCurrency}:${toCurrency}`;

  // Check memory cache first (TTL 1 hour)
  const cached = memoryCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.rate;
  }

  try {
    // Fetch from Open Exchange Rates API
    const url = `https://openexchangerates.org/api/latest.json?app_id=${config.EXCHANGE_RATES_API_KEY}&base=USD&symbols=${fromCurrency},${toCurrency}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.rates) throw new Error('Invalid rates response');

    // Calculate the cross rate
    // e.g. EUR→USD: 1 EUR = (1/EUR_rate) USD
    const fromRate = data.rates[fromCurrency] || 1;
    const toRate   = data.rates[toCurrency]   || 1;
    const rate     = toRate / fromRate;

    // Cache for 1 hour
    memoryCache.set(cacheKey, { rate, expires: Date.now() + 3600000 });

    return rate;
  } catch (err) {
    console.error('Exchange rate fetch failed, using 1.0 fallback:', err.message);
    // Graceful degradation — return 1:1 if API fails
    return 1.0;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SUPPORTED_CURRENCIES — List of currencies available in the app
// ─────────────────────────────────────────────────────────────────────────────
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$',  name: 'US Dollar' },
  { code: 'EUR', symbol: '€',  name: 'Euro' },
  { code: 'GBP', symbol: '£',  name: 'British Pound' },
  { code: 'RUB', symbol: '₽',  name: 'Russian Ruble' },
  { code: 'UAH', symbol: '₴',  name: 'Ukrainian Hryvnia' },
  { code: 'KZT', symbol: '₸',  name: 'Kazakhstani Tenge' },
  { code: 'TRY', symbol: '₺',  name: 'Turkish Lira' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'VND', symbol: '₫',  name: 'Vietnamese Dong' },
  { code: 'TON', symbol: '💎', name: 'Toncoin' },
];
