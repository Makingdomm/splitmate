import { getReferralStats, recordReferral } from '../services/referralService.js';

export default async function referralRoutes(fastify) {
  fastify.get('/me', async (req, reply) => {
    try {
      const stats = await getReferralStats(req.user.telegram_id);
      return reply.send(stats);
    } catch (err) {
      console.error('[referrals] GET /me error:', err.message, '| user:', req.user?.telegram_id);
      return reply.code(500).send({ error: err.message || 'Failed to load referral info' });
    }
  });

  fastify.post('/claim', async (req, reply) => {
    try {
      const { referral_code } = req.body || {};
      if (!referral_code) return reply.code(400).send({ error: 'referral_code required' });
      const result = await recordReferral(req.user.telegram_id, referral_code);
      if (!result) return reply.send({ success: false, message: 'Invalid or already used referral code' });
      return reply.send({ success: true, message: 'Referral recorded! Your friend will earn a free month when you upgrade.' });
    } catch (err) {
      console.error('[referrals] POST /claim error:', err.message);
      return reply.code(500).send({ error: err.message || 'Failed to claim referral' });
    }
  });
}
