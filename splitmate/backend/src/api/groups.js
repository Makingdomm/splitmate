// =============================================================================
// api/groups.js — Group management REST endpoints
// =============================================================================

import {
  createGroup, getGroupById, getUserGroups,
  getGroupMembers, getGroupByInviteCode, joinGroup, isMember
} from '../services/groupService.js';
import { isProUser, countUserGroups } from '../services/userService.js';
import { getGroupBalances } from '../services/expenseService.js';

const FREE_TIER_GROUP_LIMIT = 3;

export default async function groupRoutes(fastify) {

  // ── GET /api/groups — List all groups for the authenticated user ──────────
  fastify.get('/', async (req, reply) => {
    const groups = await getUserGroups(req.user.telegram_id);
    return { groups };
  });

  // ── POST /api/groups — Create a new group ─────────────────────────────────
  fastify.post('/', async (req, reply) => {
    const { name, description, currency } = req.body;

    if (!name || name.trim().length < 2) {
      return reply.code(400).send({ error: 'Group name must be at least 2 characters' });
    }
    if (name.trim().length > 50) {
      return reply.code(400).send({ error: 'Group name too long (max 50 chars)' });
    }

    // Free tier: max 3 groups
    const isPro = await isProUser(req.user.telegram_id);
    if (!isPro) {
      const groupCount = await countUserGroups(req.user.telegram_id);
      if (groupCount >= FREE_TIER_GROUP_LIMIT) {
        return reply.code(403).send({
          error: 'FREE_LIMIT_REACHED',
          message: `Free plan allows up to ${FREE_TIER_GROUP_LIMIT} groups. Upgrade to Pro for unlimited groups.`,
        });
      }
    }

    const group = await createGroup({
      name:       name.trim(),
      description: description?.trim(),
      createdBy:  req.user.telegram_id,
      currency:   currency || 'USD',
    });

    return reply.code(201).send({ group });
  });

  // ── GET /api/groups/:id — Get group details + members ────────────────────
  fastify.get('/:id', async (req, reply) => {
    const group = await getGroupById(req.params.id);
    if (!group) return reply.code(404).send({ error: 'Group not found' });

    // Only members can view group details
    const member = await isMember(req.params.id, req.user.telegram_id);
    if (!member) return reply.code(403).send({ error: 'Not a member of this group' });

    const members = await getGroupMembers(req.params.id);
    return { group, members };
  });

  // ── GET /api/groups/:id/balances — Get debt summary for a group ──────────
  fastify.get('/:id/balances', async (req, reply) => {
    const member = await isMember(req.params.id, req.user.telegram_id);
    if (!member) return reply.code(403).send({ error: 'Not a member of this group' });

    const balances = await getGroupBalances(req.params.id);
    return { balances };
  });

  // ── POST /api/groups/join — Join via invite code ──────────────────────────
  fastify.post('/join', async (req, reply) => {
    const { inviteCode } = req.body;
    if (!inviteCode) return reply.code(400).send({ error: 'Invite code required' });

    // Check free tier group limit
    const isPro = await isProUser(req.user.telegram_id);
    if (!isPro) {
      const groupCount = await countUserGroups(req.user.telegram_id);
      if (groupCount >= FREE_TIER_GROUP_LIMIT) {
        return reply.code(403).send({
          error: 'FREE_LIMIT_REACHED',
          message: 'Upgrade to Pro to join more than 3 groups.',
        });
      }
    }

    const group = await getGroupByInviteCode(inviteCode.trim().toUpperCase());
    if (!group) return reply.code(404).send({ error: 'Invalid invite code' });

    try {
      await joinGroup(group.id, req.user.telegram_id);
      const members = await getGroupMembers(group.id);
      return { group, members };
    } catch (err) {
      if (err.message === 'ALREADY_MEMBER') {
        return reply.code(409).send({ error: 'You are already in this group' });
      }
      throw err;
    }
  });

  // ── GET /api/groups/invite/:code — Preview group before joining ───────────
  fastify.get('/invite/:code', async (req, reply) => {
    const group = await getGroupByInviteCode(req.params.code);
    if (!group) return reply.code(404).send({ error: 'Invalid invite code' });

    const members = await getGroupMembers(group.id);
    // Return limited info for the preview screen
    return {
      group: {
        id:           group.id,
        name:         group.name,
        description:  group.description,
        member_count: members.length,
        currency:     group.currency,
      },
    };
  });
}
