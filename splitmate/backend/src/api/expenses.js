// =============================================================================
// api/expenses.js — Expense CRUD and settlement endpoints
// =============================================================================

import {
  addExpense, getGroupExpenses, settleDebt, deleteExpense
} from '../services/expenseService.js';
import { getGroupMembers, isMember } from '../services/groupService.js';
import { isProUser } from '../services/userService.js';
import { recordTonSettlementFee } from '../services/paymentService.js';

export default async function expenseRoutes(fastify) {

  // ── GET /api/expenses/:groupId — List expenses for a group ───────────────
  fastify.get('/:groupId', async (req, reply) => {
    const { groupId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const member = await isMember(groupId, req.user.telegram_id);
    if (!member) return reply.code(403).send({ error: 'Not a member of this group' });

    const expenses = await getGroupExpenses(groupId, parseInt(limit), parseInt(offset));
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
      paidBy,      // Optional: defaults to the authenticated user
    } = req.body;

    // Validate inputs
    if (!groupId || !amount || !description) {
      return reply.code(400).send({ error: 'groupId, amount, and description are required' });
    }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return reply.code(400).send({ error: 'Amount must be a positive number' });
    }

    // Verify membership
    const member = await isMember(groupId, req.user.telegram_id);
    if (!member) return reply.code(403).send({ error: 'Not a member of this group' });

    // Custom/percentage splits are Pro-only features
    if (splitType !== 'equal') {
      const isPro = await isProUser(req.user.telegram_id);
      if (!isPro) {
        return reply.code(403).send({
          error: 'PRO_REQUIRED',
          message: 'Custom and percentage splits require SplitMate Pro.',
        });
      }
    }

    // Get all group members to distribute the expense
    const members = await getGroupMembers(groupId);
    const memberIds = members.map(m => m.telegram_id);

    // The payer can be someone other than the requester (e.g. "John paid for us")
    const payerId = paidBy || req.user.telegram_id;

    // Verify payer is a group member
    if (!memberIds.includes(payerId)) {
      return reply.code(400).send({ error: 'Payer must be a group member' });
    }

    const result = await addExpense({
      groupId,
      paidBy:      payerId,
      amount:      parseFloat(amount),
      currency:    currency || 'USD',
      description: description.trim(),
      category,
      splitType,
      splitData,
      memberIds,
    });

    return reply.code(201).send(result);
  });

  // ── POST /api/expenses/settle — Settle a debt between two users ──────────
  fastify.post('/settle', async (req, reply) => {
    const { groupId, toUserId, amount, currency, method = 'manual', txHash } = req.body;

    if (!groupId || !toUserId || !amount) {
      return reply.code(400).send({ error: 'groupId, toUserId, and amount are required' });
    }

    // Verify membership
    const member = await isMember(groupId, req.user.telegram_id);
    if (!member) return reply.code(403).send({ error: 'Not a member of this group' });

    // TON settlement requires Pro
    if (method === 'ton') {
      const isPro = await isProUser(req.user.telegram_id);
      if (!isPro) {
        return reply.code(403).send({
          error: 'PRO_REQUIRED',
          message: 'TON wallet settlements require SplitMate Pro.',
        });
      }

      // Record the TON fee
      await recordTonSettlementFee({
        groupId,
        fromUserId: req.user.telegram_id,
        toUserId,
        amount: parseFloat(amount),
        txHash,
      });
    }

    const settlement = await settleDebt({
      groupId,
      fromUserId: req.user.telegram_id,
      toUserId,
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
}

  // ── GET /api/expenses/:groupId/export — CSV export (Pro only) ─────────────
  fastify.get('/:groupId/export', async (req, reply) => {
    const { groupId } = req.params;

    const member = await isMember(groupId, req.user.telegram_id);
    if (!member) return reply.code(403).send({ error: 'Not a member of this group' });

    const isPro = await isProUser(req.user.telegram_id);
    if (!isPro) return reply.code(403).send({ error: 'PRO_REQUIRED', message: 'CSV export is a Pro feature.' });

    // Fetch all expenses (no limit)
    const { data, error } = await (await import('../db/client.js')).supabase
      .from('expenses')
      .select(`
        id, description, amount, currency, amount_usd, category, split_type, created_at,
        users!paid_by (full_name, username),
        expense_splits (amount_owed, is_settled, users (full_name))
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (error) return reply.code(500).send({ error: error.message });

    // Build CSV
    const rows = [];
    rows.push(['Date', 'Description', 'Category', 'Amount', 'Currency', 'Amount (USD)', 'Paid By', 'Split Type', 'Settled'].join(','));

    for (const exp of data || []) {
      const paidBy = exp.users?.full_name || exp.users?.username || 'Unknown';
      const settled = exp.expense_splits?.every(s => s.is_settled) ? 'Yes' : 'No';
      const date = new Date(exp.created_at).toISOString().split('T')[0];
      const desc = `"${(exp.description || '').replace(/"/g, '""')}"`;
      rows.push([date, desc, exp.category, exp.amount, exp.currency, exp.amount_usd, `"${paidBy}"`, exp.split_type, settled].join(','));
    }

    const csv = rows.join('\n');
    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename="splitmate-${groupId}.csv"`);
    return reply.send(csv);
  });
