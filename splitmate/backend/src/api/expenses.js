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

  // ── GET /api/expenses/:groupId/analytics — Spending analytics (Pro only) ──
  fastify.get('/:groupId/analytics', async (req, reply) => {
    const { groupId } = req.params;

    const member = await isMember(groupId, req.user.telegram_id);
    if (!member) return reply.code(403).send({ error: 'Not a member of this group' });

    const isPro = await isProUser(req.user.telegram_id);
    if (!isPro) return reply.code(403).send({ error: 'PRO_REQUIRED', message: 'Analytics is a Pro feature.' });

    // Fetch all expenses with splits
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select(`
        id, description, amount, currency, amount_usd, category, created_at,
        users!paid_by (id, full_name, username),
        expense_splits (user_id, amount_owed, is_settled)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (error) return reply.code(500).send({ error: 'Failed to fetch analytics' });

    const list = expenses || [];

    // ── Total spent (USD) ──────────────────────────────────────────────────
    const totalUsd = list.reduce((s, e) => s + (e.amount_usd || 0), 0);

    // ── By category ───────────────────────────────────────────────────────
    const byCategory = {};
    for (const e of list) {
      const cat = e.category || 'other';
      byCategory[cat] = (byCategory[cat] || 0) + (e.amount_usd || 0);
    }
    const categories = Object.entries(byCategory)
      .map(([name, total]) => ({ name, total: +total.toFixed(2), pct: +(total / totalUsd * 100).toFixed(1) }))
      .sort((a, b) => b.total - a.total);

    // ── By member (who paid most) ──────────────────────────────────────────
    const byMember = {};
    for (const e of list) {
      const uid = e.users?.id?.toString();
      const name = e.users?.full_name || e.users?.username || 'Unknown';
      if (!uid) continue;
      if (!byMember[uid]) byMember[uid] = { name, paid: 0, owed: 0 };
      byMember[uid].paid += (e.amount_usd || 0);
      for (const s of e.expense_splits || []) {
        const sid = s.user_id?.toString();
        if (!byMember[sid]) byMember[sid] = { name: 'Member', paid: 0, owed: 0 };
        byMember[sid].owed += (s.amount_owed || 0);
      }
    }
    const members = Object.entries(byMember)
      .map(([id, d]) => ({ id, name: d.name, paid: +d.paid.toFixed(2), owed: +d.owed.toFixed(2) }))
      .sort((a, b) => b.paid - a.paid);

    // ── By month (spending over time) ─────────────────────────────────────
    const byMonth = {};
    for (const e of list) {
      const month = e.created_at?.slice(0, 7) || 'unknown'; // YYYY-MM
      byMonth[month] = (byMonth[month] || 0) + (e.amount_usd || 0);
    }
    const timeline = Object.entries(byMonth)
      .map(([month, total]) => ({ month, total: +total.toFixed(2) }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // ── Top expenses ──────────────────────────────────────────────────────
    const top5 = [...list]
      .sort((a, b) => (b.amount_usd || 0) - (a.amount_usd || 0))
      .slice(0, 5)
      .map(e => ({
        description: e.description,
        amount: e.amount,
        currency: e.currency,
        amountUsd: e.amount_usd,
        category: e.category,
        paidBy: e.users?.full_name || e.users?.username || 'Unknown',
        date: e.created_at?.slice(0, 10),
      }));

    // ── Settlement rate ────────────────────────────────────────────────────
    const allSplits = list.flatMap(e => e.expense_splits || []);
    const settledCount = allSplits.filter(s => s.is_settled).length;
    const settlementRate = allSplits.length > 0
      ? +(settledCount / allSplits.length * 100).toFixed(1)
      : 100;

    return {
      totalUsd: +totalUsd.toFixed(2),
      expenseCount: list.length,
      settlementRate,
      categories,
      members,
      timeline,
      top5,
    };
  });
