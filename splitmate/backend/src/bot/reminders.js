// bot/reminders.js — Automated debt reminder system

import { supabase } from '../db/client.js';
import { bot } from './commands.js';
import { config } from '../config/index.js';

export const sendDebtReminders = async () => {
  console.log('📬 Running debt reminder job...');

  try {
    // 1. Get all unsettled splits (columns: user_id, amount_owed, expense → paid_by, group_id)
    const { data: splits, error: splitsErr } = await supabase
      .from('expense_splits')
      .select(`
        user_id,
        amount_owed,
        expenses (
          paid_by,
          group_id,
          description,
          currency
        )
      `)
      .eq('is_settled', false)
      .gt('amount_owed', 0.50);

    if (splitsErr) { console.error('Reminder query error:', splitsErr.message); return; }
    if (!splits || splits.length === 0) { console.log('No outstanding debts'); return; }

    // 2. Aggregate per debtor
    const userMap = {};
    for (const s of splits) {
      const exp = s.expenses;
      if (!exp) continue;
      if (s.user_id === exp.paid_by) continue; // skip payer's own row

      const tid = String(s.user_id);
      if (!userMap[tid]) {
        userMap[tid] = { telegram_id: s.user_id, total_owed: 0, groups: new Set(), debts: [] };
      }
      userMap[tid].total_owed += parseFloat(s.amount_owed);
      if (exp.group_id) userMap[tid].groups.add(exp.group_id);
      userMap[tid].debts.push({ desc: exp.description, amount: s.amount_owed, currency: exp.currency });
    }

    const telegramIds = Object.keys(userMap);
    if (telegramIds.length === 0) { console.log('No debtors found'); return; }

    // 3. Filter to active Pro users only (pro_status=true AND not expired AND not opted out)
    const now = new Date().toISOString();
    const { data: proUsers, error: proErr } = await supabase
      .from('users')
      .select('telegram_id, reminder_opt_out')
      .in('telegram_id', telegramIds.map(Number))
      .eq('pro_status', true)
      .or(`pro_expires_at.is.null,pro_expires_at.gt.${now}`);

    if (proErr) { console.error('Pro user query error:', proErr.message); return; }

    const proSet = new Set(
      (proUsers || [])
        .filter(u => !u.reminder_opt_out)
        .map(u => String(u.telegram_id))
    );

    // 4. Send reminders
    let sent = 0, skipped = 0;

    for (const [tid, user] of Object.entries(userMap)) {
      if (!proSet.has(tid)) { skipped++; continue; }
      if (user.total_owed < 0.50) { skipped++; continue; }

      const groupCount = user.groups.size;
      const topDebts = user.debts
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3)
        .map(d => `  • ${d.desc} — ${d.currency} ${parseFloat(d.amount).toFixed(2)}`)
        .join('\n');

      const message =
        `💸 *SplitMate Reminder*\n\n` +
        `You have outstanding debts across ${groupCount} group${groupCount !== 1 ? 's' : ''}:\n\n` +
        topDebts +
        (user.debts.length > 3 ? `\n  _+${user.debts.length - 3} more…_` : '') +
        `\n\n_Tap below to settle up_ 🤝`;

      try {
        await bot.telegram.sendMessage(user.telegram_id, message, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '💸 Open SplitMate', web_app: { url: config.MINI_APP_URL } },
            ]],
          },
        });
        sent++;
        await new Promise(r => setTimeout(r, 100)); // throttle
      } catch (err) {
        // 403 = blocked, 400 = bad chat — don't crash
        console.warn(`Reminder failed for ${tid}: ${err.message}`);
      }
    }

    console.log(`✅ Debt reminders: ${sent} sent, ${skipped} skipped`);

  } catch (err) {
    console.error('sendDebtReminders crashed:', err.message);
  }
};
