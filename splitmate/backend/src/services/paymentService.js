import { supabase } from '../db/client.js';
import { activateProSubscription } from './userService.js';
import { config } from '../config/index.js';

// Use raw Telegram Bot API via fetch — avoids circular dependency with bot/commands.js
const tgApi = async (method, body) => {
  const res = await fetch(`https://api.telegram.org/bot${config.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram API error: ${data.description}`);
  return data.result;
};

export const sendProInvoice = async (telegramId, starsAmount = null) => {
  const amount = starsAmount || config.PRO_MONTHLY_STARS;

  // Determine tier name based on amount for invoice title
  const isElite = amount >= config.ELITE_MONTHLY_STARS;
  const tierName = isElite ? 'Elite' : 'Standard';

  const payload = `pro_monthly:${telegramId}:${amount}:${Date.now()}`;

  await tgApi('sendInvoice', {
    chat_id:     telegramId,
    title:       `⭐ SplitMate ${tierName} — 1 Month`,
    description: isElite
      ? 'Unlimited groups, multi-currency, receipt scanning, TON settlements, analytics, reminders & priority support.'
      : 'Unlimited groups, multi-currency, receipt scanning, TON settlements, and automated debt reminders.',
    payload,
    currency: 'XTR', // Telegram Stars
    prices: [{ label: `${tierName} Plan (1 month)`, amount }],
  });

  return { success: true, payload, tier: tierName.toLowerCase(), starsAmount: amount };
};

export const handlePreCheckoutQuery = async (query_obj) => {
  const { id, from, invoice_payload } = query_obj;
  if (!invoice_payload.startsWith('pro_monthly:')) {
    await tgApi('answerPreCheckoutQuery', {
      pre_checkout_query_id: id,
      ok: false,
      error_message: 'Invalid payment. Please try again.',
    });
    return;
  }
  await tgApi('answerPreCheckoutQuery', { pre_checkout_query_id: id, ok: true });
  console.log(`Pre-checkout approved for user ${from.id}`);
};

export const handleSuccessfulPayment = async (message) => {
  const telegramId = message.from.id;
  const { telegram_payment_charge_id, invoice_payload, total_amount, currency } = message.successful_payment;

  if (currency !== 'XTR') {
    console.error('Unexpected payment currency:', currency);
    return;
  }

  // Determine tier from amount paid
  const isElite = total_amount >= config.ELITE_MONTHLY_STARS;
  const tierName = isElite ? 'Elite' : 'Standard';

  // Idempotent upsert — prevents double activation on retry
  await supabase.from('star_payments').upsert(
    {
      telegram_id:         telegramId,
      telegram_charge_id:  telegram_payment_charge_id,
      stars_amount:        total_amount,
      payload:             invoice_payload,
    },
    { onConflict: 'telegram_charge_id', ignoreDuplicates: true }
  );

  await activateProSubscription(telegramId, isElite ? 'elite' : 'standard');

  await tgApi('sendMessage', {
    chat_id: telegramId,
    text:
      `🎉 *You're now SplitMate ${tierName}!*\n\n` +
      `Your ${tierName} subscription is active for 30 days.\n\n` +
      `✅ Unlimited groups\n` +
      `✅ Multi-currency\n` +
      `✅ Receipt scanning\n` +
      `✅ TON settlements\n` +
      `✅ Automated reminders\n` +
      (isElite ? `✅ Priority support\n✅ Advanced analytics\n` : '') +
      `\nThank you for supporting SplitMate! 💸`,
    parse_mode: 'Markdown',
  });

  console.log(`✅ ${tierName} Pro activated for user ${telegramId} — ${total_amount} Stars charged`);
};

export const recordTonSettlementFee = async ({ groupId, fromUserId, toUserId, amount, txHash }) => {
  const feeAmount = parseFloat((amount * (config.TON_FEE_PERCENT / 100)).toFixed(6));
  const { error } = await supabase.from('settlements').insert({
    group_id:     groupId,
    from_user_id: fromUserId,
    to_user_id:   toUserId,
    amount,
    currency:     'TON',
    method:       'ton',
    tx_hash:      txHash,
    fee_charged:  feeAmount,
  });
  if (error) throw new Error(error.message);
  return { feeAmount };
};
