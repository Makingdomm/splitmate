// =============================================================================
// bot/reminders.js — Automated debt reminder system (Pro feature)
// Run this as a scheduled job (e.g. via node-cron or Railway cron)
// Sends friendly nudges to users who have outstanding debts
// =============================================================================

import { query } from '../db/client.js';
import { bot } from './commands.js';
import { config } from '../config/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// sendDebtReminders — Main reminder job
// Finds Pro users with unsettled debts and sends them a summary
// ─────────────────────────────────────────────────────────────────────────────
export const sendDebtReminders = async () => {
  console.log('📬 Running debt reminder job...');

  // Find all users with active Pro who have unsettled debts
  const result = await query(`
    SELECT
      u.telegram_id,
      u.full_name,
      SUM(es.amount_owed) AS total_owed,
      COUNT(DISTINCT e.group_id) AS groups_with_debt
    FROM users u
    JOIN expense_splits es ON es.user_id = u.telegram_id AND es.is_settled = FALSE
    JOIN expenses e ON e.expense_id = es.expense_id
    WHERE u.pro_status = TRUE
      AND e.paid_by != u.telegram_id     -- They owe someone else
    GROUP BY u.telegram_id, u.full_name
    HAVING SUM(es.amount_owed) > 0.50    -- Only remind if > $0.50 outstanding
  `);

  let sent = 0;
  for (const user of result.rows) {
    try {
      await bot.telegram.sendMessage(
        user.telegram_id,
        `💸 *SplitMate Reminder*\n\n` +
        `You have *$${parseFloat(user.total_owed).toFixed(2)}* outstanding ` +
        `across ${user.groups_with_debt} group(s).\n\n` +
        `Tap below to settle up and keep things square with your friends 🤝`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '💸 Settle Up', web_app: { url: config.MINI_APP_URL } },
            ]],
          },
        }
      );
      sent++;
      // Small delay to avoid hitting Telegram rate limits (30 msg/sec)
      await new Promise(r => setTimeout(r, 50));
    } catch (err) {
      // User may have blocked the bot — just log and continue
      console.warn(`Failed to send reminder to ${user.telegram_id}:`, err.message);
    }
  }

  console.log(`✅ Sent ${sent}/${result.rows.length} debt reminders`);
};
