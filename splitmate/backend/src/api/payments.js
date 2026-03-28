import { sendProInvoice } from '../services/paymentService.js';
import { isProUser } from '../services/userService.js';
import { config } from '../config/index.js';
import { SUPPORTED_CURRENCIES } from '../services/currencyService.js';

const VALID_STAR_AMOUNTS = [100, 500, 1000]; // Basic, Standard, Elite

export default async function paymentRoutes(fastify) {

  fastify.post('/invoice', async (req, reply) => {
    const isPro = await isProUser(req.user.telegram_id);
    if (isPro) return reply.code(409).send({ error: 'ALREADY_PRO', message: 'You already have an active Pro subscription.' });

    // Accept optional starsAmount from frontend (tier selection)
    const { starsAmount } = req.body || {};
    const amount = VALID_STAR_AMOUNTS.includes(starsAmount) ? starsAmount : config.PRO_MONTHLY_STARS;

    const result = await sendProInvoice(req.user.telegram_id, amount);
    return { success: true, message: 'Invoice sent! Check your Telegram chat to complete payment.', starsAmount: amount };
  });

  fastify.get('/status', async (req, reply) => {
    const isPro = await isProUser(req.user.telegram_id);
    return {
      isPro,
      starsPrice: config.PRO_MONTHLY_STARS,
      proFeatures: [
        'Unlimited groups', 'Multi-currency support', 'Receipt photo scanning',
        'TON wallet settlements', 'Automated debt reminders',
        'Full expense history & CSV export', 'Recurring bills',
      ],
    };
  });

  fastify.get('/currencies', async (req, reply) => {
    return { currencies: SUPPORTED_CURRENCIES };
  });
}
