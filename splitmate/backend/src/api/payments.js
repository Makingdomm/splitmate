// =============================================================================
// api/payments.js — Telegram Stars payment endpoints
// This handles the upgrade flow from the Mini App UI
// =============================================================================

import { sendProInvoice } from '../services/paymentService.js';
import { isProUser } from '../services/userService.js';
import { config } from '../config/index.js';
import { SUPPORTED_CURRENCIES } from '../services/currencyService.js';

export default async function paymentRoutes(fastify) {

  // ── POST /api/payments/invoice — Trigger Stars invoice for Pro upgrade ───
  // Called from the Mini App when user taps "Upgrade to Pro"
  fastify.post('/invoice', async (req, reply) => {
    // Don't charge if already Pro
    const isPro = await isProUser(req.user.telegram_id);
    if (isPro) {
      return reply.code(409).send({
        error: 'ALREADY_PRO',
        message: 'You already have an active Pro subscription.',
      });
    }

    const result = await sendProInvoice(req.user.telegram_id);
    return {
      success:     true,
      message:     'Invoice sent! Check your Telegram chat to complete payment.',
      starsAmount: config.PRO_MONTHLY_STARS,
    };
  });

  // ── GET /api/payments/status — Check current Pro status ──────────────────
  fastify.get('/status', async (req, reply) => {
    const isPro = await isProUser(req.user.telegram_id);
    return {
      isPro,
      starsPrice: config.PRO_MONTHLY_STARS,
      proFeatures: [
        'Unlimited groups',
        'Multi-currency support',
        'Receipt photo scanning',
        'TON wallet settlements',
        'Automated debt reminders',
        'Full expense history & CSV export',
        'Recurring bills',
      ],
    };
  });

  // ── GET /api/payments/currencies — List supported currencies ─────────────
  fastify.get('/currencies', async (req, reply) => {
    return { currencies: SUPPORTED_CURRENCIES };
  });
}
