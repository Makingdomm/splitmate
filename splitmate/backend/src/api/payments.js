import { sendProInvoice } from '../services/paymentService.js';
import { isProUser, getUserByTelegramId } from '../services/userService.js';
import { config } from '../config/index.js';
import { SUPPORTED_CURRENCIES } from '../services/currencyService.js';

const VALID_STAR_AMOUNTS = [
  config.PRO_MONTHLY_STARS,    // Standard: 99
  config.ELITE_MONTHLY_STARS,  // Elite:    199
];

export default async function paymentRoutes(fastify) {

  fastify.post('/invoice', async (req, reply) => {
    const user = await getUserByTelegramId(req.user.telegram_id);
    const isPro = user?.pro_status && (!user?.pro_expires_at || new Date(user.pro_expires_at) > new Date());
    if (isPro) return reply.code(409).send({ error: 'ALREADY_PRO', message: 'You already have an active Pro subscription.' });

    const { starsAmount } = req.body || {};
    const amount = VALID_STAR_AMOUNTS.includes(Number(starsAmount))
      ? Number(starsAmount)
      : config.PRO_MONTHLY_STARS;

    await sendProInvoice(req.user.telegram_id, amount);
    return {
      success: true,
      message: 'Invoice sent! Check your Telegram chat to complete payment.',
      starsAmount: amount,
    };
  });

  fastify.get('/status', async (req, reply) => {
    const user = await getUserByTelegramId(req.user.telegram_id);
    const isPro = user?.pro_status && (!user?.pro_expires_at || new Date(user.pro_expires_at) > new Date());
    const tier = isPro ? (user?.pro_tier || 'standard') : null;
    const isElite = tier === 'elite';

    return {
      isPro,
      tier,        // 'standard' | 'elite' | null
      isElite,     // convenience bool
      starsPrice:      config.PRO_MONTHLY_STARS,
      eliteStarsPrice: config.ELITE_MONTHLY_STARS,
      proExpiresAt: user?.pro_expires_at || null,
      proFeatures: [
        'Unlimited groups',
        'Multi-currency support',
        'Receipt photo scanning',
        'TON wallet settlements',
        'Automated debt reminders',
        'Full expense history & CSV export',
      ],
      eliteFeatures: [
        'Everything in Standard',
        'Advanced analytics dashboard',
        'Priority support',
        'Early access to new features',
      ],
    };
  });

  fastify.get('/currencies', async (req, reply) => {
    return { currencies: SUPPORTED_CURRENCIES };
  });
}
