// =============================================================================
// tonService.js — TON blockchain integration
//
// Uses @ton/ton + @ton/core for:
//   • Address validation & normalization
//   • Transaction verification (did the user actually send X TON?)
//   • Pro upgrade via TON payment — create & verify payment
//
// Uses TON Center API (free, no API key for basic reads) for tx lookups.
// Set TON_API_KEY in env for higher rate limits (get from toncenter.com).
// =============================================================================

import { Address, fromNano, toNano } from '@ton/core';
import { config } from '../config/index.js';

const TON_API_BASE = config.TON_TESTNET
  ? 'https://testnet.toncenter.com/api/v2'
  : 'https://toncenter.com/api/v2';

const TON_API_KEY = process.env.TON_API_KEY || '';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Make a GET request to TON Center API.
 */
async function tonApi(endpoint, params = {}) {
  const url = new URL(`${TON_API_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  }
  const headers = TON_API_KEY ? { 'X-API-Key': TON_API_KEY } : {};
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`TON API HTTP ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(`TON API error: ${data.error || JSON.stringify(data)}`);
  return data.result;
}

// ── Address helpers ───────────────────────────────────────────────────────────

/**
 * Validate and normalise a TON address string.
 * Returns the user-friendly (bounceable) form, or null if invalid.
 */
export function normalizeTonAddress(raw) {
  try {
    const addr = Address.parse(raw.trim());
    return addr.toString({ bounceable: true, urlSafe: true });
  } catch {
    return null;
  }
}

/**
 * Returns true if two TON addresses refer to the same contract.
 */
export function isSameTonAddress(a, b) {
  try {
    return Address.parse(a).equals(Address.parse(b));
  } catch {
    return false;
  }
}

/**
 * Convert TON amount (float) → nanotons string for deep-links.
 * e.g. 1.5 TON → "1500000000"
 */
export function toNanoString(ton) {
  return toNano(ton.toFixed(9)).toString();
}

/**
 * Convert nanotons → TON float.
 */
export function fromNanoFloat(nano) {
  return parseFloat(fromNano(BigInt(nano)));
}

// ── Wallet balance ────────────────────────────────────────────────────────────

export async function getTonBalance(address) {
  try {
    const result = await tonApi('getAddressBalance', { address });
    return fromNanoFloat(result);
  } catch (err) {
    console.warn('[TON] getBalance error:', err.message);
    return null;
  }
}

// ── Transaction verification ──────────────────────────────────────────────────

/**
 * Verify that a TON transfer actually happened on-chain.
 *
 * Checks the RECIPIENT's incoming transactions for:
 *   - from address === sender's address
 *   - amount >= expectedTon (with 0.005 TON tolerance for fees)
 *   - transaction is recent (within `maxAgeSeconds`)
 *   - comment matches (if provided)
 *
 * Returns { verified: true, tx } or { verified: false, reason }
 */
export async function verifyTonTransfer({
  recipientAddress,
  senderAddress,
  expectedTon,
  comment,
  maxAgeSeconds = 600, // 10 minutes
}) {
  try {
    const normalRecipient = normalizeTonAddress(recipientAddress);
    const normalSender    = normalizeTonAddress(senderAddress);
    if (!normalRecipient || !normalSender) {
      return { verified: false, reason: 'Invalid address format' };
    }

    // Fetch last 20 incoming transactions for the recipient
    const txs = await tonApi('getTransactions', {
      address: normalRecipient,
      limit:   20,
    });

    const now = Math.floor(Date.now() / 1000);
    const minAmount = expectedTon - 0.005; // 0.005 TON fee tolerance

    for (const tx of txs) {
      // Age check
      if (now - tx.utime > maxAgeSeconds) continue;

      // Must have an incoming message (in_msg)
      const inMsg = tx.in_msg;
      if (!inMsg || !inMsg.source) continue;

      // Source must match sender
      if (!isSameTonAddress(inMsg.source, normalSender)) continue;

      // Amount check (value is in nanotons as string)
      const sentTon = fromNanoFloat(inMsg.value || '0');
      if (sentTon < minAmount) continue;

      // Optional comment check
      if (comment) {
        const msgText = inMsg.message || '';
        if (!msgText.includes(comment)) continue;
      }

      return { verified: true, tx, sentTon };
    }

    return { verified: false, reason: 'No matching transaction found' };
  } catch (err) {
    console.error('[TON] verifyTonTransfer error:', err.message);
    return { verified: false, reason: err.message };
  }
}

// ── Pro upgrade via TON ───────────────────────────────────────────────────────

// How much TON each Pro tier costs (configurable via env)
export const TON_PRO_PRICES = {
  standard: parseFloat(process.env.TON_PRICE_STANDARD || '1.5'),  // ~$3
  elite:    parseFloat(process.env.TON_PRICE_ELITE    || '3.0'),  // ~$6
};

// The app's TON receiving wallet (set this in Railway env vars)
export const APP_TON_WALLET = process.env.APP_TON_WALLET || '';

/**
 * Build a ton:// deep-link for the user to pay for Pro.
 * Returns the link + a comment they must include so we can verify.
 */
export function buildProPaymentLink({ telegramId, tier }) {
  const price = TON_PRO_PRICES[tier];
  if (!price) throw new Error('Invalid tier');
  if (!APP_TON_WALLET) throw new Error('APP_TON_WALLET not configured');

  // Unique comment = identifier for this payment
  const comment = `splitmate_pro_${telegramId}_${tier}_${Date.now()}`;
  const nano    = toNanoString(price);

  const link = `ton://transfer/${APP_TON_WALLET}?amount=${nano}&text=${encodeURIComponent(comment)}`;
  return { link, comment, ton: price, tier };
}

/**
 * Verify a Pro payment on-chain after the user says they paid.
 * senderAddress = user's TON wallet address (from TON Connect)
 * comment       = the unique comment we generated in buildProPaymentLink
 */
export async function verifyProPayment({ senderAddress, tier, comment }) {
  const price = TON_PRO_PRICES[tier];
  if (!APP_TON_WALLET) throw new Error('APP_TON_WALLET not configured');

  const result = await verifyTonTransfer({
    recipientAddress: APP_TON_WALLET,
    senderAddress,
    expectedTon:      price,
    comment,
    maxAgeSeconds:    1800, // 30 min window
  });

  return result;
}
