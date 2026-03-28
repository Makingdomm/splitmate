import { supabase } from '../db/client.js';
import { activateProSubscription } from './userService.js';
import { config } from '../config/index.js';
import TelegramBot from 'node-telegram-bot-api';

const bot = new TelegramBot(config.BOT_TOKEN);

export const sendProInvoice = async (telegramId) => {
  const payload = `pro_monthly:${telegramId}:${Date.now()}`;
  await bot.sendInvoice(
    telegramId,
    '⭐ SplitMate Pro — 1 Month',
    'Unlock unlimited groups, multi-currency, receipt scanning, TON settlements, and automated debt reminders.',
    payload, '', 'XTR',
    [{ label: 'Pro Subscription (1 month)', amount: config.PRO_MONTHLY_STARS }]
  );
  return { success: true, payload };
};

export const handlePreCheckoutQuery = async (query_obj) => {
  const { id, from, invoice_payload } = query_obj;
  if (!invoice_payload.startsWith('pro_monthly:')) {
    await bot.answerPreCheckoutQuery(id, false, { error_message: 'Invalid payment. Please try again.' });
    return;
  }
  await bot.answerPreCheckoutQuery(id, true);
  console.log(`Pre-checkout approved for user ${from.id}`);
};

export const handleSuccessfulPayment = async (message) => {
  const telegramId = message.from.id;
  const { telegram_payment_charge_id, invoice_payload, total_amount, currency } = message.successful_payment;

  if (currency !== 'XTR') { console.error('Unexpected currency:', currency); return; }

  // Record payment (ignore duplicate charge IDs via upsert)
  await supabase.from('star_payments').upsert(
    { telegram_id: telegramId, telegram_charge_id: telegram_payment_charge_id, stars_amount: total_amount, payload: invoice_payload },
    { onConflict: 'telegram_charge_id', ignoreDuplicates: true }
  );

  await activateProSubscription(telegramId);

  await bot.sendMessage(telegramId,
    `🎉 *You're now SplitMate Pro!*\n\nYour Pro subscription is active for 30 days.\n\n✅ Unlimited groups\n✅ Multi-currency\n✅ Receipt scanning\n✅ TON settlements\n✅ Automated reminders\n\nThank you for supporting SplitMate! 💸`,
    { parse_mode: 'Markdown' }
  );

  console.log(`✅ Pro activated for user ${telegramId} — ${total_amount} Stars charged`);
};

export const recordTonSettlementFee = async ({ groupId, fromUserId, toUserId, amount, txHash }) => {
  const feeAmount = parseFloat((amount * (config.TON_FEE_PERCENT / 100)).toFixed(6));

  const { error } = await supabase.from('settlements').insert({
    group_id: groupId, from_user_id: fromUserId, to_user_id: toUserId,
    amount, currency: 'TON', method: 'ton', tx_hash: txHash, fee_charged: feeAmount
  });
  if (error) throw new Error(error.message);

  return { feeAmount };
};
