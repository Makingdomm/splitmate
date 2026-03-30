// =============================================================================
// services/recurringService.js — Recurring expense scheduler
// Runs daily via CRON, creates new expense entries for due recurring expenses
// =============================================================================

import { supabase } from '../db/client.js';
import { addExpense } from './expenseService.js';
import { getGroupMembers as getMembers } from './groupService.js';
import { notifyNewExpense } from './notificationService.js';

/**
 * Process all recurring expenses that are due today or overdue
 * Called by the daily CRON job
 */
export const processRecurringExpenses = async () => {
  const now = new Date();

  const { data: due, error } = await supabase
    .from('expenses')
    .select('*, users!paid_by(full_name, telegram_id)')
    .eq('is_recurring', true)
    .not('recur_next_date', 'is', null)
    .lte('recur_next_date', now.toISOString());

  if (error) { console.error('[RECURRING] DB error:', error.message); return; }
  if (!due?.length) { console.log('[RECURRING] No recurring expenses due'); return; }

  console.log(`[RECURRING] Processing ${due.length} recurring expense(s)...`);

  for (const expense of due) {
    try {
      const members = await getMembers(expense.group_id);
      const memberIds = members.map(m => m.telegram_id);

      // Create the new expense (copy of original)
      const { expense: newExpense } = await addExpense({
        groupId:     expense.group_id,
        paidBy:      expense.paid_by,
        amount:      parseFloat(expense.amount),
        currency:    expense.currency,
        description: expense.description,
        category:    expense.category,
        splitType:   expense.split_type,
        memberIds,
        isRecurring: true,
        recurInterval: expense.recur_interval,
        recurParentId: expense.id,
      });

      // Calculate next due date
      const next = new Date(expense.recur_next_date);
      if (expense.recur_interval === 'weekly') {
        next.setDate(next.getDate() + 7);
      } else if (expense.recur_interval === 'monthly') {
        next.setMonth(next.getMonth() + 1);
      }

      // Update the original recurring template's next date
      await supabase
        .from('expenses')
        .update({ recur_next_date: next.toISOString() })
        .eq('id', expense.id);

      // Notify group members
      await notifyNewExpense({
        groupId: expense.group_id,
        expense: newExpense,
        paidByName: expense.users?.full_name || 'Someone',
        actorId: -1, // notify everyone including payer for recurring
      });

      console.log(`[RECURRING] Created expense for "${expense.description}" in group ${expense.group_id}`);
    } catch (err) {
      console.error(`[RECURRING] Failed to process expense ${expense.id}:`, err.message);
    }
  }
};
