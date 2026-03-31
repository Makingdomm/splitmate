// =============================================================================
// ton.js — TON payment API routes
//
// POST /api/ton/pro-link   → generate ton:// payment link for Pro upgrade
// POST /api/ton/verify-pro → verify on-chain payment and activate Pro
// GET  /api/ton/price      → current TON prices for Pro tiers
// GET  /api/ton/balance/:address → get TON wallet balance (public)
// =============================================================================

import {
  buildProPaymentLink,
  verifyProPayment,
  TON_PRO_PRICES,
  getTonBalance,
  normalizeTonAddress,
} from '../services/tonService.js';
import { activateProSubscription, isProUser } from '../services/userService.js';
import { grantReferralReward } from '../services/referralService.js';
import { supabase } from '../db/client.js';

export default async function tonRoutes(fastify) {

  // ── GET /api/ton/price ────────────────────────────────────────────────────
  fastify.get('/price', async (req, reply) => {
    return {
      prices: TON_PRO_PRICES,
      wallet: process.env.APP_TON_WALLET || null,
      currency: 'TON',
    };
  });

  // ── POST /api/ton/pro-link ────────────────────────────────────────────────
  // Body: { tier: 'standard' | 'elite' }
  // Returns: { link, comment, ton, tier }
  fastify.post('/pro-link', async (req, reply) => {
    const { tier = 'standard' } = req.body || {};

    if (!['standard', 'elite'].includes(tier)) {
      return reply.code(400).send({ error: 'Invalid tier. Use standard or elite.' });
    }

    const isPro = await isProUser(req.user.telegram_id);
    if (isPro) {
      return reply.code(409).send({ error: 'ALREADY_PRO', message: 'You already have an active Pro subscription.' });
    }

    try {
      const result = buildProPaymentLink({ telegramId: req.user.telegram_id, tier });

      // Store pending payment so we can verify it later
      await supabase.from('ton_pending_payments').upsert({
        telegram_id: req.user.telegram_id,
        tier,
        comment: result.comment,
        ton_amount: result.ton,
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
      }, { onConflict: 'telegram_id' });

      return result;
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // ── POST /api/ton/verify-pro ──────────────────────────────────────────────
  // Body: { senderAddress?: 'EQ...' }  (optional — backend can scan by comment too)
  // Looks up the pending comment from DB, verifies on-chain, activates Pro
  fastify.post('/verify-pro', async (req, reply) => {
    const { senderAddress } = req.body || {};

    let normalized = null;
    if (senderAddress) {
      normalized = normalizeTonAddress(senderAddress);
      if (!normalized) {
        return reply.code(400).send({ error: 'Invalid TON address format' });
      }
    }

    // Look up pending payment
    const { data: pending, error: dbErr } = await supabase
      .from('ton_pending_payments')
      .select('*')
      .eq('telegram_id', req.user.telegram_id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (dbErr || !pending) {
      return reply.code(404).send({ error: 'No pending payment found. Please generate a new payment link.' });
    }

    // Verify on-chain (senderAddress optional — can verify by comment alone)
    const result = await verifyProPayment({
      senderAddress: normalized,
      tier:    pending.tier,
      comment: pending.comment,
      receiverAddress: process.env.APP_TON_WALLET || null,
    });

    if (!result.verified) {
      return reply.code(402).send({
        error:  'Payment not found on blockchain yet.',
        reason: result.reason,
        hint:   'Wait a few seconds and try again — TON transactions usually confirm in under 10 seconds.',
      });
    }

    // Payment confirmed! Activate Pro
    await activateProSubscription(req.user.telegram_id, pending.tier || 'standard');

    // Grant referral reward if this user was referred
    try {
      const reward = await grantReferralReward(req.user.telegram_id);
      if (reward) console.log(`🎁 TON referral reward granted to user ${reward.referrer_id}`);
    } catch (e) {
      console.error('[ton referral reward] Error:', e.message);
    }

    // Mark payment as completed
    await supabase
      .from('ton_pending_payments')
      .update({
        status:      'completed',
        tx_hash:     result.tx?.transaction_id?.hash || null,
        sent_ton:    result.sentTon,
        confirmed_at: new Date().toISOString(),
      })
      .eq('telegram_id', req.user.telegram_id);

    // Notify via Telegram
    const tgApi = async (method, body) => {
      const res = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) console.warn('TG notify failed:', data.description);
    };

    await tgApi('sendMessage', {
      chat_id: req.user.telegram_id,
      text: `🎉 *Pro activated via TON!*\n\nYour ${pending.tier.charAt(0).toUpperCase() + pending.tier.slice(1)} plan is now active.\n\n💎 ${result.sentTon.toFixed(3)} TON received — thank you!\n\n✅ Unlimited groups\n✅ Multi-currency\n✅ Receipt scanning\n✅ TON settlements`,
      parse_mode: 'Markdown',
    });

    return { success: true, tier: pending.tier, sentTon: result.sentTon };
  });

  // ── GET /api/ton/balance/:address ─────────────────────────────────────────
  // Public: no auth needed — used to show wallet balance in UI
  fastify.get('/balance/:address', { config: { skipAuth: true } }, async (req, reply) => {
    const { address } = req.params;
    const normalized = normalizeTonAddress(address);
    if (!normalized) {
      return reply.code(400).send({ error: 'Invalid TON address' });
    }
    const balance = await getTonBalance(normalized);
    return { address: normalized, ton: balance };
  });
}
