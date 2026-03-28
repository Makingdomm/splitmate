// =============================================================================
// services/expenseService.js — Expense creation, splitting, and balance math
// This is the core financial engine of SplitMate
// =============================================================================

import { query, transaction } from '../db/client.js';
import { getExchangeRate } from './currencyService.js';

// ─────────────────────────────────────────────────────────────────────────────
// addExpense — Create an expense and calculate splits
//
// splitData format for 'equal':    null (auto-split among all members)
// splitData format for 'custom':   [{ userId, amount }]
// splitData format for 'percentage': [{ userId, percentage }]
// ─────────────────────────────────────────────────────────────────────────────
export const addExpense = async ({
  groupId,
  paidBy,
  amount,
  currency,
  description,
  category = 'general',
  splitType = 'equal',
  splitData = null,
  memberIds,       // Array of telegram_ids of all group members to split among
}) => {
  return await transaction(async (client) => {
    // Convert amount to USD for normalized calculations
    const exchangeRate = await getExchangeRate(currency, 'USD');
    const amountUsd = parseFloat((amount * exchangeRate).toFixed(2));

    // Insert the expense record
    const expenseResult = await client.query(
      `INSERT INTO expenses
         (group_id, paid_by, amount, currency, amount_usd, description, category, split_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [groupId, paidBy, amount, currency, amountUsd, description, category, splitType]
    );
    const expense = expenseResult.rows[0];

    // ── Calculate splits ────────────────────────────────────────────────────
    const splits = calculateSplits({
      expense,
      splitType,
      splitData,
      memberIds,
      paidBy,
    });

    // Insert split records for each member
    for (const split of splits) {
      await client.query(
        `INSERT INTO expense_splits (expense_id, user_id, amount_owed)
         VALUES ($1, $2, $3)`,
        [expense.id, split.userId, split.amountOwed]
      );
    }

    return { expense, splits };
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// calculateSplits — Pure function that returns split amounts per user
// The payer's own split is recorded as 0 (they already paid)
// ─────────────────────────────────────────────────────────────────────────────
const calculateSplits = ({ expense, splitType, splitData, memberIds, paidBy }) => {
  const splits = [];

  if (splitType === 'equal') {
    // Divide equally among all members
    const perPerson = parseFloat((expense.amount / memberIds.length).toFixed(2));

    // Handle rounding: add/subtract remainder to payer's share
    const remainder = parseFloat(
      (expense.amount - perPerson * memberIds.length).toFixed(2)
    );

    memberIds.forEach((userId, index) => {
      let amount = perPerson;
      if (index === 0) amount = parseFloat((amount + remainder).toFixed(2));
      splits.push({
        userId,
        // Payer owes 0 to themselves for this expense
        amountOwed: userId === paidBy ? 0 : amount,
      });
    });

  } else if (splitType === 'custom') {
    // splitData: [{ userId, amount }]
    splitData.forEach(({ userId, amount }) => {
      splits.push({
        userId,
        amountOwed: userId === paidBy ? 0 : parseFloat(amount.toFixed(2)),
      });
    });

  } else if (splitType === 'percentage') {
    // splitData: [{ userId, percentage }]
    splitData.forEach(({ userId, percentage }) => {
      const amountOwed = parseFloat(
        ((expense.amount * percentage) / 100).toFixed(2)
      );
      splits.push({
        userId,
        amountOwed: userId === paidBy ? 0 : amountOwed,
      });
    });
  }

  return splits;
};

// ─────────────────────────────────────────────────────────────────────────────
// getGroupExpenses — Paginated expense list for a group
// ─────────────────────────────────────────────────────────────────────────────
export const getGroupExpenses = async (groupId, limit = 20, offset = 0) => {
  const result = await query(
    `SELECT
       e.*,
       u.full_name AS paid_by_name,
       u.username  AS paid_by_username,
       json_agg(json_build_object(
         'user_id',    es.user_id,
         'amount_owed', es.amount_owed,
         'is_settled', es.is_settled,
         'full_name',  su.full_name
       )) AS splits
     FROM expenses e
     JOIN users u ON u.telegram_id = e.paid_by
     LEFT JOIN expense_splits es ON es.expense_id = e.id
     LEFT JOIN users su ON su.telegram_id = es.user_id
     WHERE e.group_id = $1
     GROUP BY e.id, u.full_name, u.username
     ORDER BY e.created_at DESC
     LIMIT $2 OFFSET $3`,
    [groupId, limit, offset]
  );
  return result.rows;
};

// ─────────────────────────────────────────────────────────────────────────────
// getGroupBalances — The simplified debt graph for a group
// Returns: who owes how much to whom (minimized transactions algorithm)
// ─────────────────────────────────────────────────────────────────────────────
export const getGroupBalances = async (groupId) => {
  // Step 1: Get raw per-user net balances
  const result = await query(
    `SELECT
       u.telegram_id,
       u.full_name,
       u.username,
       u.ton_wallet,
       -- Amount user paid for others (money coming in)
       COALESCE(SUM(CASE WHEN e.paid_by = u.telegram_id AND es.user_id != u.telegram_id AND es.is_settled = FALSE
                    THEN es.amount_owed ELSE 0 END), 0) AS total_paid_for_others,
       -- Amount user owes to others (money going out)
       COALESCE(SUM(CASE WHEN es.user_id = u.telegram_id AND e.paid_by != u.telegram_id AND es.is_settled = FALSE
                    THEN es.amount_owed ELSE 0 END), 0) AS total_owed
     FROM group_members gm
     JOIN users u ON u.telegram_id = gm.user_id
     LEFT JOIN expenses e ON e.group_id = gm.group_id
     LEFT JOIN expense_splits es ON es.expense_id = e.id
     WHERE gm.group_id = $1
     GROUP BY u.telegram_id, u.full_name, u.username, u.ton_wallet`,
    [groupId]
  );

  const members = result.rows;

  // Step 2: Calculate net balance per person
  // Positive = they are owed money; Negative = they owe money
  const balances = members.map(m => ({
    ...m,
    net: parseFloat(m.total_paid_for_others) - parseFloat(m.total_owed),
  }));

  // Step 3: Minimize transactions algorithm
  // Sort into creditors (positive) and debtors (negative)
  const transactions = minimizeTransactions(balances);

  return { balances, transactions };
};

// ─────────────────────────────────────────────────────────────────────────────
// minimizeTransactions — Greedy algorithm to reduce number of payments
// Given net balances, find the minimum set of transactions to settle all debts
// ─────────────────────────────────────────────────────────────────────────────
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
    const settle = Math.min(creditors[i].amount, debtors[j].amount);
    settle_amount = parseFloat(settle.toFixed(2));

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
      amount: settle_amount,
    });

    creditors[i].amount -= settle;
    debtors[j].amount   -= settle;

    if (creditors[i].amount < 0.01) i++;
    if (debtors[j].amount < 0.01)   j++;
  }

  return transactions;
};

// ─────────────────────────────────────────────────────────────────────────────
// settleDebt — Mark splits as settled and record the settlement
// ─────────────────────────────────────────────────────────────────────────────
export const settleDebt = async ({
  groupId,
  fromUserId,
  toUserId,
  amount,
  currency = 'USD',
  method = 'manual',
  txHash = null,
}) => {
  return await transaction(async (client) => {
    // Mark all relevant unsettled splits as settled
    await client.query(
      `UPDATE expense_splits es
       SET is_settled = TRUE, settled_at = NOW()
       FROM expenses e
       WHERE es.expense_id = e.id
         AND e.group_id    = $1
         AND es.user_id    = $2
         AND e.paid_by     = $3
         AND es.is_settled = FALSE`,
      [groupId, fromUserId, toUserId]
    );

    // Record the settlement transaction
    const result = await client.query(
      `INSERT INTO settlements
         (group_id, from_user_id, to_user_id, amount, currency, method, tx_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [groupId, fromUserId, toUserId, amount, currency, method, txHash]
    );

    return result.rows[0];
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// deleteExpense — Soft delete (only group admin or expense creator can delete)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteExpense = async (expenseId, requestingUserId) => {
  // Verify ownership or admin role
  const expenseCheck = await query(
    'SELECT paid_by, group_id FROM expenses WHERE id = $1',
    [expenseId]
  );
  if (!expenseCheck.rows[0]) throw new Error('EXPENSE_NOT_FOUND');

  const { paid_by, group_id } = expenseCheck.rows[0];

  const isAdmin = await query(
    `SELECT role FROM group_members
     WHERE group_id = $1 AND user_id = $2 AND role = 'admin'`,
    [group_id, requestingUserId]
  );

  if (paid_by !== requestingUserId && isAdmin.rows.length === 0) {
    throw new Error('UNAUTHORIZED');
  }

  // Delete splits first (cascade would also handle this, but explicit is safer)
  await query('DELETE FROM expense_splits WHERE expense_id = $1', [expenseId]);
  await query('DELETE FROM expenses WHERE id = $1', [expenseId]);
};
