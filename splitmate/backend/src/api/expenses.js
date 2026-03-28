// =============================================================================
// api/expenses.js — Expense CRUD and settlement endpoints
// =============================================================================

import {
  addExpense, getGroupExpenses, settleDebt, deleteExpense
} from '../services/expenseService.js';
import { getGroupMembers, isMember } from '../services/groupService.js';
import { isProUser } from '../services/userService.js';
import { recordTonSettlementFee } from '../services/paymentService.js';
import { supabase } from '../db/client.js';

const MAX_LIMIT = 100;

export default async function expenseRoutes(fastify) {

  // ── GET /api/expenses/:groupId — List expenses for a group ───────────────
  fastify.get('/:groupId', async (req, reply) => {
    const { groupId } = req.params;
    const limit  = Math.min(parseInt(req.query.limit  || '20', 10), MAX_LIMIT);
    const offset = Math.max(parseInt(req.query.offset || '0',  10), 0);

    const member = await isMember(groupId, req.user.telegram_id);
    if (!member) return reply.code(403).send({ error: 'Not a member of this group' });

    const expenses = await getGroupExpenses(groupId, limit, offset);
    return { expenses };
  });

  // ── POST /api/expenses — Add a new expense ────────────────────────────────
  fastify.post('/', async (req, reply) => {
    const {
      groupId,
      amount,
      currency,
      description,
      category,
      splitType = 'equal',
      splitData,
      paidBy,
    } = req.body || {};

    // Validate inputs
    if (!groupId || !amount || !description) {
      return reply.code(400).send({ error: 'groupId, amount, and description are required' });
    }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return reply.code(400).send({ error: 'Amount must be a positive number' });
    }
    if (description.trim().length > 200) {
      return reply.code(400).send({ error: 'Description too long (max 200 chars)' });
    }

    // Verify membership
    const member = await isMember(groupId, req.user.telegram_id);
    if (!member) return reply.code(403).send({ error: 'Not a member of this group' });

    // Custom/percentage splits are Pro-only
    if (splitType !== 'equal') {
      const isPro = await isProUser(req.user.telegram_id);
      if (!isPro) {
        return reply.code(403).send({
          error: 'PRO_REQUIRED',
          message: 'Custom and percentage splits require SplitMate Pro.',
        });
      }
    }

    const members = await getGroupMembers(groupId);
    const memberIds = members.map(m => m.telegram_id);

    // Validate paidBy — must be integer and a group member
    const payerId = paidBy ? parseInt(paidBy, 10) : req.user.telegram_id;
    if (isNaN(payerId) || !memberIds.includes(payerId)) {
      return reply.code(400).send({ error: 'Payer must be a group member' });
    }

    const result = await addExpense({
      groupId,
      paidBy:      payerId,
      amount:      parseFloat(amount),
      currency:    currency || 'USD',
      description: description.trim(),
      category:    category || 'general',
      splitType,
      splitData,
      memberIds,
    });

    return reply.code(201).send(result);
  });

  // ── POST /api/expenses/settle — Settle a debt between two users ──────────
  fastify.post('/settle', async (req, reply) => {
    const { groupId, toUserId, amount, currency, method = 'manual', txHash } = req.body || {};

    if (!groupId || !toUserId || !amount) {
      return reply.code(400).send({ error: 'groupId, toUserId, and amount are required' });
    }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return reply.code(400).send({ error: 'Amount must be positive' });
    }

    // Cannot settle with yourself
    if (parseInt(toUserId, 10) === req.user.telegram_id) {
      return reply.code(400).send({ error: 'Cannot settle with yourself' });
    }

    const member = await isMember(groupId, req.user.telegram_id);
    if (!member) return reply.code(403).send({ error: 'Not a member of this group' });

    if (method === 'ton') {
      const isPro = await isProUser(req.user.telegram_id);
      if (!isPro) {
        return reply.code(403).send({
          error: 'PRO_REQUIRED',
          message: 'TON wallet settlements require SplitMate Pro.',
        });
      }
      await recordTonSettlementFee({
        groupId,
        fromUserId: req.user.telegram_id,
        toUserId:   parseInt(toUserId, 10),
        amount:     parseFloat(amount),
        txHash,
      });
    }

    const settlement = await settleDebt({
      groupId,
      fromUserId: req.user.telegram_id,
      toUserId:   parseInt(toUserId, 10),
      amount:     parseFloat(amount),
      currency:   currency || 'USD',
      method,
      txHash,
    });

    return { settlement };
  });

  // ── DELETE /api/expenses/:id — Delete an expense ─────────────────────────
  fastify.delete('/:id', async (req, reply) => {
    try {
      await deleteExpense(req.params.id, req.user.telegram_id);
      return { success: true };
    } catch (err) {
      if (err.message === 'EXPENSE_NOT_FOUND') return reply.code(404).send({ error: 'Expense not found' });
      if (err.message === 'UNAUTHORIZED')      return reply.code(403).send({ error: 'Not authorized to delete this expense' });
      throw err;
    }
  });

  // ── GET /api/expenses/:groupId/export — CSV export (Pro only) ─────────────
  fastify.get('/:groupId/export', async (req, reply) => {
    const { groupId } = req.params;

    const member = await isMember(groupId, req.user.telegram_id);
    if (!member) return reply.code(403).send({ error: 'Not a member of this group' });

    const isPro = await isProUser(req.user.telegram_id);
    if (!isPro) return reply.code(403).send({ error: 'PRO_REQUIRED', message: 'CSV export is a Pro feature.' });

    const { data, error } = await supabase
      .from('expenses')
      .select(`
        id, description, amount, currency, amount_usd, category, split_type, created_at,
        users!paid_by (full_name, username),
        expense_splits (amount_owed, is_settled)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (error) return reply.code(500).send({ error: 'Failed to fetch expenses' });

    const rows = [
      ['Date', 'Description', 'Category', 'Amount', 'Currency', 'Amount (USD)', 'Paid By', 'Split Type', 'Settled'].join(','),
    ];

    for (const exp of data || []) {
      const paidBy  = exp.users?.full_name || exp.users?.username || 'Unknown';
      const settled = exp.expense_splits?.every(s => s.is_settled) ? 'Yes' : 'No';
      const date    = new Date(exp.created_at).toISOString().split('T')[0];
      const desc    = `"${(exp.description || '').replace(/"/g, '""')}"`;
      rows.push([date, desc, exp.category, exp.amount, exp.currency, exp.amount_usd, `"${paidBy}"`, exp.split_type, settled].join(','));
    }

    const csv = rows.join('\n');
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="splitmate-${groupId}.csv"`);
    return reply.send(csv);
  });
}
