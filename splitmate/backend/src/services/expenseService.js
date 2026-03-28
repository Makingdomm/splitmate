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

  const splitRows = splits.map(s => ({ expense_id: expense.id, user_id: s.userId, amount_owed: s.amountOwed }));
  const { error: sErr } = await supabase.from('expense_splits').insert(splitRows);
  if (sErr) throw new Error(sErr.message);

  return { expense, splits };
};

const calculateSplits = ({ expense, splitType, splitData, memberIds, paidBy }) => {
  const splits = [];
  if (splitType === 'equal') {
    const perPerson = parseFloat((expense.amount / memberIds.length).toFixed(2));
    const remainder = parseFloat((expense.amount - perPerson * memberIds.length).toFixed(2));
    memberIds.forEach((userId, index) => {
      let amt = perPerson;
      if (index === 0) amt = parseFloat((amt + remainder).toFixed(2));
      splits.push({ userId, amountOwed: userId === paidBy ? 0 : amt });
    });
  } else if (splitType === 'custom') {
    splitData.forEach(({ userId, amount }) => {
      splits.push({ userId, amountOwed: userId === paidBy ? 0 : parseFloat(amount.toFixed(2)) });
    });
  } else if (splitType === 'percentage') {
    splitData.forEach(({ userId, percentage }) => {
      const amountOwed = parseFloat(((expense.amount * percentage) / 100).toFixed(2));
      splits.push({ userId, amountOwed: userId === paidBy ? 0 : amountOwed });
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

  const memberList = members.map(m => m.users);
  const balances = memberList.map(m => {
    const paidForOthers = splits
      .filter(s => s.expenses.paid_by === m.telegram_id && s.user_id !== m.telegram_id)
      .reduce((sum, s) => sum + parseFloat(s.amount_owed), 0);
    const totalOwed = splits
      .filter(s => s.user_id === m.telegram_id && s.expenses.paid_by !== m.telegram_id)
      .reduce((sum, s) => sum + parseFloat(s.amount_owed), 0);
    return { ...m, total_paid_for_others: paidForOthers, total_owed: totalOwed, net: paidForOthers - totalOwed };
  });

  return { balances, transactions: minimizeTransactions(balances) };
};

const minimizeTransactions = (balances) => {
  const creditors = balances.filter(b => b.net > 0.01).map(b => ({ ...b, amount: b.net })).sort((a, b) => b.amount - a.amount);
  const debtors   = balances.filter(b => b.net < -0.01).map(b => ({ ...b, amount: Math.abs(b.net) })).sort((a, b) => b.amount - a.amount);
  const transactions = [];
  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const settle = parseFloat(Math.min(creditors[i].amount, debtors[j].amount).toFixed(2));
    transactions.push({ from: { telegram_id: debtors[j].telegram_id, full_name: debtors[j].full_name, ton_wallet: debtors[j].ton_wallet }, to: { telegram_id: creditors[i].telegram_id, full_name: creditors[i].full_name, ton_wallet: creditors[i].ton_wallet }, amount: settle });
    creditors[i].amount -= settle;
    debtors[j].amount -= settle;
    if (creditors[i].amount < 0.01) i++;
    if (debtors[j].amount < 0.01) j++;
  }
  return transactions;
};

export const settleDebt = async ({ groupId, fromUserId, toUserId, amount, currency = 'USD', method = 'manual', txHash = null }) => {
  // Mark splits as settled
  const { data: expenseIds } = await supabase.from('expenses').select('id').eq('group_id', groupId).eq('paid_by', toUserId);
  if (expenseIds?.length) {
    await supabase.from('expense_splits')
      .update({ is_settled: true, settled_at: new Date().toISOString() })
      .in('expense_id', expenseIds.map(e => e.id))
      .eq('user_id', fromUserId)
      .eq('is_settled', false);
  }

  const { data, error } = await supabase
    .from('settlements')
    .insert({ group_id: groupId, from_user_id: fromUserId, to_user_id: toUserId, amount, currency, method, tx_hash: txHash })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const deleteExpense = async (expenseId, requestingUserId) => {
  const { data: expense } = await supabase.from('expenses').select('paid_by, group_id').eq('id', expenseId).maybeSingle();
  if (!expense) throw new Error('EXPENSE_NOT_FOUND');

  const { data: member } = await supabase.from('group_members').select('role').eq('group_id', expense.group_id).eq('user_id', requestingUserId).maybeSingle();
  if (expense.paid_by !== requestingUserId && member?.role !== 'admin') throw new Error('UNAUTHORIZED');

  await supabase.from('expense_splits').delete().eq('expense_id', expenseId);
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
  if (error) throw new Error(error.message);
};
