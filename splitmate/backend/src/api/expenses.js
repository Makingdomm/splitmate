// =============================================================================
// api/expenses.js — Expense CRUD and settlement endpoints
// =============================================================================

import {
  addExpense, getGroupExpenses, settleDebt, deleteExpense
} from '../services/expenseService.js';
import { getGroupMembers, isMember } from '../services/groupService.js';
import { isProUser } from '../services/userService.js';
import { recordTonSettlementFee } from '../services/paymentService.js';
import { notifyNewExpense, notifySettlement } from '../services/notificationService.js';
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
      groupId, amount, currency, description, category,
      splitType = 'equal', splitData, paidBy,
      isRecurring = false, recurInterval,
    } = req.body || {};

    if (!groupId || !amount || !description) {
      return reply.code(400).send({ error: 'groupId, amount, and description are required' });
    }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return reply.code(400).send({ error: 'Amount must be a positive number' });
    }
    if (parseFloat(amount) > 1_000_000) {
      return reply.code(400).send({ error: 'Amount exceeds maximum allowed (1,000,000)' });
    }
    if (description.trim().length > 200) {
      return reply.code(400).send({ error: 'Description too long (max 200 chars)' });
    }

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

    // Recurring is Pro-only
    if (isRecurring) {
      const isPro = await isProUser(req.user.telegram_id);
      if (!isPro) {
        return reply.code(403).send({
          error: 'PRO_REQUIRED',
          message: 'Recurring expenses require SplitMate Pro.',
        });
      }
    }

    const members = await getGroupMembers(groupId);
    const memberIds = members.map(m => m.telegram_id);

    const payerId = paidBy ? parseInt(paidBy, 10) : req.user.telegram_id;
    if (isNaN(payerId) || !memberIds.includes(payerId)) {
      return reply.code(400).send({ error: 'Payer must be a group member' });
    }

    // Calculate recur_next_date
    let recurNextDate = null;
    if (isRecurring && recurInterval) {
      const next = new Date();
      if (recurInterval === 'weekly') next.setDate(next.getDate() + 7);
      else if (recurInterval === 'monthly') next.setMonth(next.getMonth() + 1);
      recurNextDate = next.toISOString();
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
      isRecurring,
      recurInterval,
      recurNextDate,
    });

    // Fire-and-forget push notification to all other group members
    const paidByUser = members.find(m => Number(m.telegram_id) === Number(payerId));
    notifyNewExpense({
      groupId,
      expense: result.expense,
      paidByName: paidByUser?.full_name || 'Someone',
      actorId: req.user.telegram_id,
    }).catch(() => {});

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
      if (txHash) {
        await recordTonSettlementFee({
          groupId,
          fromUserId: req.user.telegram_id,
          toUserId:   parseInt(toUserId, 10),
          amount:     parseFloat(amount),
          txHash,
        });
      }
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

    // Notify the payee
    const { data: fromUser } = await supabase
      .from('users').select('full_name').eq('telegram_id', req.user.telegram_id).single();
    const { data: grp } = await supabase
      .from('groups').select('name').eq('id', groupId).single();
    notifySettlement({
      toUserId:  parseInt(toUserId, 10),
      fromName:  fromUser?.full_name || 'Someone',
      amount:    parseFloat(amount),
      currency:  currency || 'USD',
      groupName: grp?.name || 'your group',
    }).catch(() => {});

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

  // ── PATCH /api/expenses/:id/recurring — Toggle or update recurring settings
  fastify.patch('/:id/recurring', async (req, reply) => {
    const { isRecurring, recurInterval } = req.body || {};
    const { id } = req.params;

    const { data: expense } = await supabase
      .from('expenses').select('group_id, paid_by').eq('id', id).maybeSingle();
    if (!expense) return reply.code(404).send({ error: 'Expense not found' });

    const isPro = await isProUser(req.user.telegram_id);
    if (!isPro) return reply.code(403).send({ error: 'PRO_REQUIRED', message: 'Recurring requires Pro.' });

    let recurNextDate = null;
    if (isRecurring && recurInterval) {
      const next = new Date();
      if (recurInterval === 'weekly') next.setDate(next.getDate() + 7);
      else if (recurInterval === 'monthly') next.setMonth(next.getMonth() + 1);
      recurNextDate = next.toISOString();
    }

    const { data, error } = await supabase
      .from('expenses')
      .update({ is_recurring: isRecurring, recur_interval: recurInterval || null, recur_next_date: recurNextDate })
      .eq('id', id)
      .select().single();

    if (error) throw new Error(error.message);
    return { expense: data };
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
        id, description, amount, currency, amount_usd, category, split_type, is_recurring, recur_interval, created_at,
        users!paid_by (full_name, username),
        expense_splits (amount_owed, is_settled)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (error) return reply.code(500).send({ error: 'Failed to fetch expenses' });

    const rows = [
      ['Date', 'Description', 'Category', 'Amount', 'Currency', 'Amount (USD)', 'Paid By', 'Split Type', 'Recurring', 'Settled'].join(','),
    ];

    for (const exp of data || []) {
      const paidBy  = exp.users?.full_name || exp.users?.username || 'Unknown';
      const settled = exp.expense_splits?.every(s => s.is_settled) ? 'Yes' : 'No';
      const date    = new Date(exp.created_at).toISOString().split('T')[0];
      const desc    = `"${(exp.description || '').replace(/"/g, '""')}"`;
      const recur   = exp.is_recurring ? (exp.recur_interval || 'yes') : 'No';
      rows.push([date, desc, exp.category, exp.amount, exp.currency, exp.amount_usd, `"${paidBy}"`, exp.split_type, recur, settled].join(','));
    }

    const csv = rows.join('\n');
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="splitmate-${groupId}.csv"`);
    return reply.send(csv);
  });


  // ── GET /api/expenses/my-analytics — Global account analytics across all groups ──
  fastify.get('/my-analytics', async (req, reply) => {
    const telegramId = req.user.telegram_id;

    // Get all groups the user is a member of
    const { data: memberships, error: memErr } = await supabase
      .from('group_members')
      .select('group_id, groups(id, name, currency)')
      .eq('user_id', telegramId);

    if (memErr) return reply.code(500).send({ error: 'Failed to fetch groups' });

    // Filter out memberships where the group was deleted (join returns null)
    const validMemberships = (memberships || []).filter(m => m.groups && m.groups.id);
    const groupIds = validMemberships.map(m => m.group_id);
    if (groupIds.length === 0) {
      return { totalUsd: 0, youOweUsd: 0, owedToYouUsd: 0, expenseCount: 0, groupCount: 0, categories: [], groups: [], recentExpenses: [] };
    }

    // Fetch all expenses across all groups
    const { data: expenses, error: expErr } = await supabase
      .from('expenses')
      .select(`
        id, description, amount, currency, amount_usd, category, created_at, group_id,
        users!paid_by (id, telegram_id, full_name, username),
        expense_splits (user_id, amount_owed, is_settled)
      `)
      .in('group_id', groupIds)
      .order('created_at', { ascending: false });

    if (expErr) return reply.code(500).send({ error: 'Failed to fetch expenses' });

    const list = expenses || [];
    const telegramIdStr = telegramId.toString();

    // Total spent across all groups (all expenses)
    const totalUsd = list.reduce((s, e) => s + (e.amount_usd || 0), 0);

    // What user owes (unsettled splits where user is the debtor)
    let youOweUsd = 0;
    let owedToYouUsd = 0;
    for (const e of list) {
      const paidByMe = e.users?.telegram_id?.toString() === telegramIdStr;
      for (const s of e.expense_splits || []) {
        if (s.is_settled) continue;
        if (s.user_id?.toString() === telegramIdStr && !paidByMe) {
          youOweUsd += (s.amount_owed || 0);
        }
        if (paidByMe && s.user_id?.toString() !== telegramIdStr) {
          owedToYouUsd += (s.amount_owed || 0);
        }
      }
    }

    // Category breakdown
    const byCategory = {};
    for (const e of list) {
      const cat = e.category || 'other';
      byCategory[cat] = (byCategory[cat] || 0) + (e.amount_usd || 0);
    }
    const categories = Object.entries(byCategory)
      .map(([name, total]) => ({ name, total: +total.toFixed(2), pct: totalUsd > 0 ? +(total / totalUsd * 100).toFixed(1) : 0 }))
      .sort((a, b) => b.total - a.total);

    // Per-group summary
    const groupMap = {};
    for (const m of validMemberships) {
      groupMap[m.group_id] = { id: m.group_id, name: m.groups?.name || 'Group', total: 0, count: 0 };
    }
    for (const e of list) {
      if (groupMap[e.group_id]) {
        groupMap[e.group_id].total += (e.amount_usd || 0);
        groupMap[e.group_id].count++;
      }
    }
    const groups = Object.values(groupMap)
      .map(g => ({ ...g, total: +g.total.toFixed(2) }))
      .sort((a, b) => b.total - a.total);

    // Monthly spending timeline (last 6 months)
    const byMonth = {};
    for (const e of list) {
      const d = new Date(e.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      byMonth[key] = (byMonth[key] || 0) + (e.amount_usd || 0);
    }
    const timeline = Object.entries(byMonth)
      .map(([month, total]) => ({ month, total: +total.toFixed(2) }))
      .sort((a,b) => a.month.localeCompare(b.month))
      .slice(-6);

    // Recent 5 expenses
    const recentExpenses = list.slice(0, 5).map(e => ({
      id: e.id,
      description: e.description,
      amount_usd: e.amount_usd,
      category: e.category || 'other',
      created_at: e.created_at,
      group_id: e.group_id,
      group_name: groupMap[e.group_id]?.name || 'Group',
      paid_by: e.users?.full_name || e.users?.username || 'Unknown',
    }));

    return {
      totalUsd: +totalUsd.toFixed(2),
      youOweUsd: +youOweUsd.toFixed(2),
      owedToYouUsd: +owedToYouUsd.toFixed(2),
      expenseCount: list.length,
      groupCount: groupIds.length,
      categories,
      groups,
      timeline,
      recentExpenses,
    };
  });

  // ── GET /api/expenses/:groupId/analytics — Spending analytics (Pro only) ──
  fastify.get('/:groupId/analytics', async (req, reply) => {
    const { groupId } = req.params;

    const member = await isMember(groupId, req.user.telegram_id);
    if (!member) return reply.code(403).send({ error: 'Not a member of this group' });

    const isPro = await isProUser(req.user.telegram_id);
    if (!isPro) return reply.code(403).send({ error: 'PRO_REQUIRED', message: 'Analytics is a Pro feature.' });

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
    const totalUsd = list.reduce((s, e) => s + (e.amount_usd || 0), 0);

    const byCategory = {};
    for (const e of list) {
      const cat = e.category || 'other';
      byCategory[cat] = (byCategory[cat] || 0) + (e.amount_usd || 0);
    }
    const categories = Object.entries(byCategory)
      .map(([name, total]) => ({ name, total: +total.toFixed(2), pct: totalUsd > 0 ? +(total / totalUsd * 100).toFixed(1) : 0 }))
      .sort((a, b) => b.total - a.total);

    const byMember = {};
    for (const e of list) {
      const uid = e.users?.id?.toString();
      const name = e.users?.full_name || e.users?.username || 'Unknown';
      if (!uid) continue;
      if (!byMember[uid]) byMember[uid] = { name, paid: 0, owed: 0 };
      byMember[uid].paid += (e.amount_usd || 0);
      for (const s of e.expense_splits || []) {
        const sid = s.user_id?.toString();
        if (!sid) continue;
        if (!byMember[sid]) byMember[sid] = { name: 'Member', paid: 0, owed: 0 };
        byMember[sid].owed += (s.amount_owed || 0);
      }
    }
    const members = Object.entries(byMember)
      .map(([id, d]) => ({ id, name: d.name, paid: +d.paid.toFixed(2), owed: +d.owed.toFixed(2) }))
      .sort((a, b) => b.paid - a.paid);

    // Timeline: group by week
    const byWeek = {};
    for (const e of list) {
      const d = new Date(e.created_at);
      const week = `${d.getFullYear()}-W${String(Math.ceil((d.getDate()) / 7)).padStart(2, '0')}`;
      byWeek[week] = (byWeek[week] || 0) + (e.amount_usd || 0);
    }
    const timeline = Object.entries(byWeek)
      .map(([week, total]) => ({ week, total: +total.toFixed(2) }))
      .sort((a, b) => a.week.localeCompare(b.week));

    return { totalUsd: +totalUsd.toFixed(2), categories, members, timeline, expenseCount: list.length };
  });
}
