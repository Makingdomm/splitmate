// =============================================================================
// services/notificationService.js — Telegram push notifications
// Sends messages to group members when expenses are added/settled
// =============================================================================

import { bot } from '../bot/commands.js';
import { supabase } from '../db/client.js';

/**
 * Notify all group members (except the actor) when a new expense is added
 */
export const notifyNewExpense = async ({ groupId, expense, paidByName, actorId }) => {
  try {
    const { data: members } = await supabase
      .from('group_members')
      .select('users(telegram_id, full_name, notify_new_expense)')
      .eq('group_id', groupId);

    const { data: group } = await supabase
      .from('groups').select('name').eq('id', groupId).single();

    if (!members || !group) return;

    const notifyList = members
      .map(m => m.users)
      .filter(u => u && Number(u.telegram_id) !== Number(actorId) && u.notify_new_expense !== false);

    const emoji = { food:'🍕', transport:'🚗', accommodation:'🏨', entertainment:'🎬', shopping:'🛍️', health:'💊', utilities:'💡', general:'💰' };
    const cat = emoji[expense.category] || '💰';

    for (const user of notifyList) {
      try {
        await bot.telegram.sendMessage(
          user.telegram_id,
          `${cat} *New expense in ${group.name}*\n\n` +
          `*${paidByName}* paid *${expense.currency} ${parseFloat(expense.amount).toFixed(2)}* for "${expense.description}"\n\n` +
          `Open SplitMate to see your share.`,
          { parse_mode: 'Markdown' }
        );
      } catch (e) {
        // User may have blocked the bot — ignore silently
        if (!e.message?.includes('blocked') && !e.message?.includes('chat not found')) {
          console.error(`[NOTIFY] Failed to notify ${user.telegram_id}:`, e.message);
        }
      }
    }
  } catch (err) {
    console.error('[NOTIFY] notifyNewExpense error:', err.message);
  }
};

/**
 * Notify when a debt is settled
 */
export const notifySettlement = async ({ toUserId, fromName, amount, currency, groupName }) => {
  try {
    await bot.telegram.sendMessage(
      toUserId,
      `✅ *Payment received!*\n\n*${fromName}* settled *${currency} ${parseFloat(amount).toFixed(2)}* with you in *${groupName}*`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {
    if (!e.message?.includes('blocked') && !e.message?.includes('chat not found')) {
      console.error(`[NOTIFY] Failed to notify settlement ${toUserId}:`, e.message);
    }
  }
};
