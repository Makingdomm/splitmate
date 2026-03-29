import { supabase } from '../db/client.js';
import { getExchangeRate } from './currencyService.js';

export const addExpense = async ({ groupId, paidBy, amount, currency, description, category = 'general', splitType = 'equal', splitData = null, memberIds }) => {
  const exchangeRate = await getExchangeRate(currency, 'USD');
  const amountUsd = parseFloat((amount * exchangeRate).toFixed(2));

  const { data: expense, error: eErr } = await supabase
    .from('expenses')
    .insert({ group_id: groupId, paid_by: paidBy, amount, currency, amount_usd: amountUsd, description, category, split_type: splitType })
    .select()
    .single();
  if (eErr) throw new Error(eErr.message);

  const splits = calculateSplits({ expense, splitType, splitData, memberIds, paidBy });

  // Only insert splits where amount_owed > 0 (the payer doesn't owe themselves)
  const splitRows = splits
    .filter(s => s.amountOwed > 0)
    .map(s => ({ expense_id: expense.id, user_id: s.userId, amount_owed: s.amountOwed }));

  if (splitRows.length > 0) {
    const { error: sErr } = await supabase.from('expense_splits').insert(splitRows);
    if (sErr) throw new Error(sErr.message);
  }

  return { expense, splits };
};

const calculateSplits = ({ expense, splitType, splitData, memberIds, paidBy }) => {
  const splits = [];

  if (splitType === 'equal') {
    const count = memberIds.length;
    if (count === 0) return splits;

    const perPerson = parseFloat((expense.amount / count).toFixed(2));
    const remainder = parseFloat((expense.amount - perPerson * count).toFixed(2));

    memberIds.forEach((userId, index) => {
      let amt = perPerson;
      // Add remainder to first non-payer, or to first person if payer is not first
      if (index === 0) amt = parseFloat((amt + remainder).toFixed(2));
      // FIX: use Number() to ensure type-safe comparison (paidBy is number, userId could be number or bigint from DB)
      splits.push({ userId, amountOwed: Number(userId) === Number(paidBy) ? 0 : amt });
    });

  } else if (splitType === 'custom') {
    if (!Array.isArray(splitData)) return splits;
    splitData.forEach(({ userId, amount }) => {
      const amountOwed = parseFloat(parseFloat(amount).toFixed(2));
      splits.push({ userId, amountOwed: Number(userId) === Number(paidBy) ? 0 : amountOwed });
    });

  } else if (splitType === 'percentage') {
    if (!Array.isArray(splitData)) return splits;
    splitData.forEach(({ userId, percentage }) => {
      const amountOwed = parseFloat(((expense.amount * percentage) / 100).toFixed(2));
      splits.push({ userId, amountOwed: Number(userId) === Number(paidBy) ? 0 : amountOwed });
    });
  }

  return splits;
};

export const getGroupExpenses = async (groupId, limit = 20, offset = 0) => {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      users!paid_by (full_name, username),
      expense_splits (user_id, amount_owed, is_settled, users (full_name))
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);
  return data;
};

export const getGroupBalances = async (groupId) => {
  // Get all members
  const { data: members, error: mErr } = await supabase
    .from('group_members')
    .select('users (telegram_id, full_name, username, ton_wallet)')
    .eq('group_id', groupId);
  if (mErr) throw new Error(mErr.message);

  // Get all unsettled splits with expense info
  const { data: splits, error: sErr } = await supabase
    .from('expense_splits')
    .select('user_id, amount_owed, expenses!inner(paid_by, group_id)')
    .eq('expenses.group_id', groupId)
    .eq('is_settled', false);
  if (sErr) throw new Error(sErr.message);

  const memberList = (members || []).map(m => m.users).filter(Boolean);

  const balances = memberList.map(m => {
    // FIX: use Number() for consistent type comparison (BIGINT from DB vs JS number)
    const paidForOthers = (splits || [])
      .filter(s => Number(s.expenses.paid_by) === Number(m.telegram_id) && Number(s.user_id) !== Number(m.telegram_id))
      .reduce((sum, s) => sum + parseFloat(s.amount_owed), 0);

    const totalOwed = (splits || [])
      .filter(s => Number(s.user_id) === Number(m.telegram_id) && Number(s.expenses.paid_by) !== Number(m.telegram_id))
      .reduce((sum, s) => sum + parseFloat(s.amount_owed), 0);

    return {
      ...m,
      total_paid_for_others: +paidForOthers.toFixed(2),
      total_owed: +totalOwed.toFixed(2),
      net: +(paidForOthers - totalOwed).toFixed(2),
    };
  });

  return { balances, transactions: minimizeTransactions(balances) };
};

const minimizeTransactions = (balances) => {
  const creditors = balances
    .filter(b => b.net > 0.01)
    .map(b => ({ ...b, amount: b.net }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = balances
    .filter(b => b.net < -0.01)
    .map(b => ({ ...b, amount: Math.abs(b.net) }))
    .sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let i = 0, j = 0;

  while (i < creditors.length && j < debtors.length) {
    const settle = parseFloat(Math.min(creditors[i].amount, debtors[j].amount).toFixed(2));
    if (settle < 0.01) break; // safety guard

    transactions.push({
      from: {
        telegram_id: debtors[j].telegram_id,
        full_name:   debtors[j].full_name,
        ton_wallet:  debtors[j].ton_wallet,
      },
      to: {
        telegram_id: creditors[i].telegram_id,
        full_name:   creditors[i].full_name,
        ton_wallet:  creditors[i].ton_wallet,
      },
      amount: settle,
    });

    creditors[i].amount = +(creditors[i].amount - settle).toFixed(2);
    debtors[j].amount   = +(debtors[j].amount   - settle).toFixed(2);

    if (creditors[i].amount < 0.01) i++;
    if (debtors[j].amount   < 0.01) j++;
  }

  return transactions;
};

export const settleDebt = async ({ groupId, fromUserId, toUserId, amount, currency = 'USD', method = 'manual', txHash = null }) => {
  // Mark all unsettled splits as settled for expenses paid by toUserId in this group
  const { data: expenseIds } = await supabase
    .from('expenses')
    .select('id')
    .eq('group_id', groupId)
    .eq('paid_by', toUserId);

  if (expenseIds?.length) {
    const ids = expenseIds.map(e => e.id);
    await supabase
      .from('expense_splits')
      .update({ is_settled: true, settled_at: new Date().toISOString() })
      .in('expense_id', ids)
      .eq('user_id', fromUserId)
      .eq('is_settled', false);
  }

  const { data, error } = await supabase
    .from('settlements')
    .insert({
      group_id:     groupId,
      from_user_id: fromUserId,
      to_user_id:   toUserId,
      amount,
      currency,
      method,
      tx_hash: txHash,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const deleteExpense = async (expenseId, requestingUserId) => {
  const { data: expense } = await supabase
    .from('expenses')
    .select('paid_by, group_id')
    .eq('id', expenseId)
    .maybeSingle();

  if (!expense) throw new Error('EXPENSE_NOT_FOUND');

  const { data: member } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', expense.group_id)
    .eq('user_id', requestingUserId)
    .maybeSingle();

  // FIX: use Number() to avoid type mismatch (BIGINT paid_by vs JS number requestingUserId)
  const isOwner = Number(expense.paid_by) === Number(requestingUserId);
  const isAdmin = member?.role === 'admin';

  if (!isOwner && !isAdmin) throw new Error('UNAUTHORIZED');

  // Splits are cascade-deleted via FK, but explicit delete is safer
  await supabase.from('expense_splits').delete().eq('expense_id', expenseId);
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
  if (error) throw new Error(error.message);
};
