// bot/reminders.js — Automated debt reminder system (Pro feature)

import { supabase } from '../db/client.js';
import { bot } from './commands.js';
import { config } from '../config/index.js';

export const sendDebtReminders = async () => {
  console.log('📬 Running debt reminder job...');

  // Get Pro users who have unsettled debts
  const { data: splits, error } = await supabase
    .from('expense_splits')
    .select(`
      user_id, amount_owed,
      expenses!inner (paid_by, group_id),
      users!user_id (telegram_id, full_name, pro_status)
    `)
    .eq('is_settled', false)
    .eq('users.pro_status', true);

  if (error) { console.error('Reminder query error:', error.message); return; }

  // Aggregate per user
  const userMap = {};
  for (const s of splits || []) {
    if (!s.users || s.expenses.paid_by === s.user_id) continue;
    const tid = s.user_id;
    if (!userMap[tid]) userMap[tid] = { telegram_id: tid, full_name: s.users.full_name, total_owed: 0, groups: new Set() };
    userMap[tid].total_owed += parseFloat(s.amount_owed);
    userMap[tid].groups.add(s.expenses.group_id);
  }

  let sent = 0;
  for (const user of Object.values(userMap)) {
    if (user.total_owed < 0.50) continue;
    try {
      await bot.telegram.sendMessage(
        user.telegram_id,
        `💸 *SplitMate Reminder*\n\nYou have *$${user.total_owed.toFixed(2)}* outstanding across ${user.groups.size} group(s).\n\nTap below to settle up 🤝`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: '💸 Settle Up', web_app: { url: config.MINI_APP_URL } }]] },
        }
      );
      sent++;
      await new Promise(r => setTimeout(r, 50));
    } catch (err) {
      console.warn(`Failed to send reminder to ${user.telegram_id}:`, err.message);
    }
  }

  console.log(`✅ Sent ${sent} debt reminders`);
};
