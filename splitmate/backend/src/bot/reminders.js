// bot/reminders.js — Automated debt reminder system

import { supabase } from '../db/client.js';
import { bot } from './commands.js';
import { config } from '../config/index.js';

export const sendDebtReminders = async () => {
  console.log('📬 Running debt reminder job...');

  try {
    // 1. Get all unsettled splits with expense + group info
    const { data: splits, error: splitsErr } = await supabase
      .from('expense_splits')
      .select(`
        user_telegram_id,
        amount_owed,
        expenses (
          paid_by_telegram_id,
          group_id,
          description,
          currency
        )
      `)
      .eq('is_settled', false)
      .gt('amount_owed', 0.50);

    if (splitsErr) { console.error('Reminder query error:', splitsErr.message); return; }

    if (!splits || splits.length === 0) {
      console.log('No outstanding debts to remind about');
      return;
    }

    // 2. Aggregate debts per debtor telegram_id
    const userMap = {};
    for (const s of splits) {
      const exp = s.expenses;
      if (!exp) continue;
      // Skip if this person is the one who paid (shouldn't happen, but safety check)
      if (s.user_telegram_id === exp.paid_by_telegram_id) continue;

      const tid = s.user_telegram_id;
      if (!userMap[tid]) {
        userMap[tid] = {
          telegram_id: tid,
          total_owed: 0,
          groups: new Set(),
          currencies: new Set(),
          debts: [],
        };
      }
      userMap[tid].total_owed += parseFloat(s.amount_owed);
      if (exp.group_id) userMap[tid].groups.add(exp.group_id);
      if (exp.currency) userMap[tid].currencies.add(exp.currency);
      userMap[tid].debts.push({ desc: exp.description, amount: s.amount_owed, currency: exp.currency });
    }

    // 3. Check which users have Pro status
    const telegramIds = Object.keys(userMap);
    if (telegramIds.length === 0) { console.log('No debtors found'); return; }

    const { data: proUsers, error: proErr } = await supabase
      .from('users')
      .select('telegram_id, full_name, reminder_opt_out')
      .in('telegram_id', telegramIds)
      .eq('pro_status', true);

    if (proErr) { console.error('Pro user query error:', proErr.message); return; }

    const proSet = new Set((proUsers || []).filter(u => !u.reminder_opt_out).map(u => u.telegram_id.toString()));

    // 4. Send reminders
    let sent = 0, skipped = 0;
    for (const [tid, user] of Object.entries(userMap)) {
      // Only send to Pro users
      if (!proSet.has(tid.toString())) { skipped++; continue; }
      if (user.total_owed < 0.50) { skipped++; continue; }

      // Build message
      const groupCount = user.groups.size;
      const currency = user.currencies.size === 1 ? [...user.currencies][0] : 'mixed currencies';
      const topDebts = user.debts
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3)
        .map(d => `  • ${d.desc} — ${d.currency} ${parseFloat(d.amount).toFixed(2)}`)
        .join('\n');

      const message = `💸 *SplitMate Reminder*\n\nYou owe a total across ${groupCount} group${groupCount !== 1 ? 's' : ''}.\n\n${topDebts}${user.debts.length > 3 ? `\n  _+${user.debts.length - 3} more…_` : ''}\n\n_Tap below to settle up_ 🤝`;

      try {
        await bot.telegram.sendMessage(tid, message, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '💸 Open SplitMate', web_app: { url: config.MINI_APP_URL } }
            ]]
          },
        });
        sent++;
        // Throttle to avoid Telegram rate limits
        await new Promise(r => setTimeout(r, 100));
      } catch (err) {
        // 403 = user blocked bot, 400 = bad chat id — don't crash, just log
        console.warn(`Reminder failed for ${tid}: ${err.message}`);
      }
    }

    console.log(`✅ Debt reminders: ${sent} sent, ${skipped} skipped`);

  } catch (err) {
    console.error('sendDebtReminders crashed:', err.message);
  }
};
