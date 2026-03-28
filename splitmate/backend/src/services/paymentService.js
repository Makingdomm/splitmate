// =============================================================================
// services/paymentService.js — Telegram Stars payment handling
// This is the monetization core — handles Pro subscription purchases
//
// Flow:
//   1. User taps "Upgrade to Pro" in Mini App
//   2. Frontend calls POST /api/payments/invoice
//   3. We send an invoice via Bot API (answerWebAppQuery or sendInvoice)
//   4. User pays in Telegram native Stars payment UI
//   5. Telegram sends pre_checkout_query webhook → we approve it
//   6. Telegram sends successful_payment webhook → we activate Pro
// =============================================================================

import { query } from '../db/client.js';
import { activateProSubscription } from './userService.js';
import { config } from '../config/index.js';
import TelegramBot from 'node-telegram-bot-api';

// We need direct Bot API access for sending invoices
const bot = new TelegramBot(config.BOT_TOKEN);

// ─────────────────────────────────────────────────────────────────────────────
// sendProInvoice — Send a Telegram Stars invoice to a user
// Called when user requests upgrade from the Mini App
// ─────────────────────────────────────────────────────────────────────────────
export const sendProInvoice = async (telegramId) => {
  // The payload links the payment back to the user when webhook arrives
  const payload = `pro_monthly:${telegramId}:${Date.now()}`;

  await bot.sendInvoice(
    telegramId,
    '⭐ SplitMate Pro — 1 Month',                       // title
    'Unlock unlimited groups, multi-currency, receipt scanning, TON settlements, and automated debt reminders.', // description
    payload,                                              // our tracking payload
    '',                                                   // provider_token (empty for Stars)
    'XTR',                                               // currency — XTR = Telegram Stars
    [{ label: 'Pro Subscription (1 month)', amount: config.PRO_MONTHLY_STARS }]
  );

  return { success: true, payload };
};

// ─────────────────────────────────────────────────────────────────────────────
// handlePreCheckoutQuery — Telegram calls this before charging the user
// We MUST answer within 10 seconds — approve or deny the payment
// ─────────────────────────────────────────────────────────────────────────────
export const handlePreCheckoutQuery = async (query_obj) => {
  const { id, from, invoice_payload } = query_obj;

  // Validate the payload format
  if (!invoice_payload.startsWith('pro_monthly:')) {
    // Reject unknown payment types
    await bot.answerPreCheckoutQuery(id, false, {
      error_message: 'Invalid payment. Please try again.',
    });
    return;
  }

  // All good — approve the payment
  await bot.answerPreCheckoutQuery(id, true);
  console.log(`Pre-checkout approved for user ${from.id}`);
};

// ─────────────────────────────────────────────────────────────────────────────
// handleSuccessfulPayment — Called after Stars are deducted from user's wallet
// This is where we actually grant Pro access — do NOT miss this step!
// ─────────────────────────────────────────────────────────────────────────────
export const handleSuccessfulPayment = async (message) => {
  const telegramId = message.from.id;
  const payment    = message.successful_payment;

  const {
    telegram_payment_charge_id,
    invoice_payload,
    total_amount,        // In Stars
    currency,            // Should be 'XTR'
  } = payment;

  // Validate currency (should always be XTR for Stars)
  if (currency !== 'XTR') {
    console.error('Unexpected payment currency:', currency);
    return;
  }

  // Record the payment in DB (idempotent — ignore duplicate charge IDs)
  try {
    await query(
      `INSERT INTO star_payments
         (telegram_id, telegram_charge_id, stars_amount, payload)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (telegram_charge_id) DO NOTHING`,
      [telegramId, telegram_payment_charge_id, total_amount, invoice_payload]
    );
  } catch (err) {
    console.error('Failed to record star payment:', err.message);
    // Don't return — still grant Pro access even if DB record fails
  }

  // Activate Pro subscription (30 days from now)
  await activateProSubscription(telegramId);

  // Send confirmation message to user
  await bot.sendMessage(
    telegramId,
    `🎉 *You're now SplitMate Pro!*\n\n` +
    `Your Pro subscription is active for 30 days.\n\n` +
    `✅ Unlimited groups\n` +
    `✅ Multi-currency\n` +
    `✅ Receipt scanning\n` +
    `✅ TON settlements\n` +
    `✅ Automated reminders\n\n` +
    `Thank you for supporting SplitMate! 💸`,
    { parse_mode: 'Markdown' }
  );

  console.log(`✅ Pro activated for user ${telegramId} — ${total_amount} Stars charged`);
};

// ─────────────────────────────────────────────────────────────────────────────
// recordTonSettlementFee — Log TON settlement with platform fee
// Called when a user completes a TON payment through the app
// ─────────────────────────────────────────────────────────────────────────────
export const recordTonSettlementFee = async ({
  groupId,
  fromUserId,
  toUserId,
  amount,
  txHash,
}) => {
  const feeAmount = parseFloat((amount * (config.TON_FEE_PERCENT / 100)).toFixed(6));

  await query(
    `INSERT INTO settlements
       (group_id, from_user_id, to_user_id, amount, currency, method, tx_hash, fee_charged)
     VALUES ($1, $2, $3, $4, 'TON', 'ton', $5, $6)`,
    [groupId, fromUserId, toUserId, amount, txHash, feeAmount]
  );

  return { feeAmount };
};
