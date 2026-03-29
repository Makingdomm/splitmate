// =============================================================================
// api/wallets.js — Crypto wallet management + peer lookup for settlements
// =============================================================================

import {
  getUserWallets, saveUserWallets, SUPPORTED_CHAINS
} from '../services/userService.js';
import { supabase } from '../db/client.js';
import { isMember } from '../services/groupService.js';

export default async function walletRoutes(fastify) {

  // ── GET /api/wallets — Get my wallets ─────────────────────────────────────
  fastify.get('/', async (req, reply) => {
    const wallets = await getUserWallets(req.user.telegram_id);
    return { wallets, supported_chains: SUPPORTED_CHAINS };
  });

  // ── PUT /api/wallets — Save/update my wallets ────────────────────────────
  fastify.put('/', async (req, reply) => {
    const { wallets } = req.body || {};
    if (!Array.isArray(wallets)) {
      return reply.code(400).send({ error: 'wallets must be an array' });
    }
    try {
      const saved = await saveUserWallets(req.user.telegram_id, wallets);
      return { wallets: saved };
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // ── GET /api/wallets/user/:telegramId — Get another user's wallets (for settling) ──
  // Only available if both users share a group
  fastify.get('/user/:telegramId', async (req, reply) => {
    const targetId = parseInt(req.params.telegramId, 10);
    if (isNaN(targetId)) return reply.code(400).send({ error: 'Invalid user ID' });
    if (targetId === req.user.telegram_id) {
      return reply.code(400).send({ error: 'Use /api/wallets to view your own wallets' });
    }

    // Verify they share at least one group (privacy guard)
    const { data: sharedGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', req.user.telegram_id);

    const myGroupIds = (sharedGroups || []).map(g => g.group_id);
    if (myGroupIds.length === 0) return reply.code(403).send({ error: 'No shared groups' });

    const { data: targetGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', targetId)
      .in('group_id', myGroupIds);

    if (!targetGroups || targetGroups.length === 0) {
      return reply.code(403).send({ error: 'You must share a group with this user' });
    }

    const wallets = await getUserWallets(targetId);
    return { wallets };
  });

  // ── GET /api/wallets/chains — List supported chains ──────────────────────
  fastify.get('/chains', async (req, reply) => {
    return { chains: SUPPORTED_CHAINS };
  });
}
