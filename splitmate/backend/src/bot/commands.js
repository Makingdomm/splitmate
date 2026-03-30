// =============================================================================
// bot/commands.js — All Telegram bot command handlers
// Users interact with SplitMate both through the bot AND the Mini App
// =============================================================================

import { Telegraf, Markup } from 'telegraf';
import { config } from '../config/index.js';
import { getOrCreateUser as upsertUser, isProUser } from '../services/userService.js';
import { getUserGroups, getGroupByInviteCode, joinGroup } from '../services/groupService.js';
import { getGroupBalances } from '../services/expenseService.js';
import {
  handlePreCheckoutQuery,
  handleSuccessfulPayment,
  sendProInvoice
} from '../services/paymentService.js';

// ─────────────────────────────────────────────────────────────────────────────
// Bot instance — shared across the app
// ─────────────────────────────────────────────────────────────────────────────
export const bot = new Telegraf(config.BOT_TOKEN);

// ─────────────────────────────────────────────────────────────────────────────
// Middleware: upsert every user who interacts with the bot
// ─────────────────────────────────────────────────────────────────────────────
bot.use(async (ctx, next) => {
  if (ctx.from) {
    await upsertUser({
      telegram_id: ctx.from.id,
      username:    ctx.from.username,
      full_name:   `${ctx.from.first_name} ${ctx.from.last_name || ''}`.trim(),
      photo_url:   null,
    });
  }
  return next();
});

// ─────────────────────────────────────────────────────────────────────────────
// /start — Welcome message + Mini App button
// Also handles deep links: /start group_INVITECODE
// ─────────────────────────────────────────────────────────────────────────────
bot.start(async (ctx) => {
  const startParam = ctx.startPayload;
  const firstName = ctx.from.first_name || 'there';

  // ── Group invite deep link: /start group_INVITECODE ──
  if (startParam && startParam.startsWith('group_')) {
    const inviteCode = startParam.replace('group_', '');
    const group = await getGroupByInviteCode(inviteCode);
    if (!group) {
      return ctx.reply('❌ This invite link is invalid or has expired.');
    }
    try {
      await joinGroup(group.id, ctx.from.id);
      await ctx.reply(
        `✅ You joined *${group.name}*!\n\nOpen SplitMate to see the group expenses and balances.`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.webApp('💸 Open SplitMate', config.MINI_APP_URL)],
          ]),
        }
      );
      return;
    } catch (err) {
      if (err.message === 'ALREADY_MEMBER') {
        return ctx.reply(
          `You're already in *${group.name}*! Tap below to open it.`,
          {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.webApp('💸 Open SplitMate', config.MINI_APP_URL)],
            ]),
          }
        );
      }
      throw err;
    }
  }

  // ── Detect new vs returning user ──
  // upsertUser updates updated_at every time; created_at only set on INSERT
  // We check if the user existed before this call by checking groups
  const { getUserGroups: getGroups } = await import('../services/groupService.js');
  const groups = await getGroups(ctx.from.id);
  const isNew = groups.length === 0;
  const isPro = await isProUser(ctx.from.id);

  if (isNew) {
    // ── NEW USER: Full onboarding ──
    await ctx.replyWithPhoto(
      { url: 'https://i.imgur.com/8KvGRmq.png' },
      {
        caption:
          `👋 Hey *${firstName}*, welcome to *SplitMate*!\n\n` +
          `The easiest way to split bills with friends — right inside Telegram. No apps, no sign-up, no hassle.\n\n` +
          `Here's how it works in 3 steps:\n\n` +
          `1️⃣ *Create a group* — for a trip, flat, dinner, anything\n` +
          `2️⃣ *Add expenses* as they happen\n` +
          `3️⃣ *Settle up* instantly with one tap\n\n` +
          `Tap below to create your first group 👇`,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.webApp('🚀 Create My First Group', config.MINI_APP_URL)],
          [Markup.button.callback('📖 See how it works', 'how_it_works')],
        ]),
      }
    );
  } else {
    // ── RETURNING USER: Quick dashboard ──
    const badge = isPro ? ' ⭐' : '';
    const groupWord = groups.length === 1 ? 'group' : 'groups';

    // Calculate overall net balance
    let totalNet = 0;
    for (const g of groups) {
      totalNet += parseFloat(g.total_lent || 0) - parseFloat(g.total_owed || 0);
    }
    const balanceStr = totalNet > 0
      ? `💚 You're owed *${totalNet.toFixed(2)}* overall`
      : totalNet < 0
      ? `🔴 You owe *${Math.abs(totalNet).toFixed(2)}* overall`
      : `✅ All settled up!`;

    await ctx.reply(
      `👋 Welcome back, *${firstName}${badge}*!\n\n` +
      `You have *${groups.length} ${groupWord}*\n` +
      `${balanceStr}\n\n` +
      `What do you want to do?`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.webApp('💸 Open SplitMate', config.MINI_APP_URL)],
          [Markup.button.callback('📊 Quick balances', 'quick_balances')],
          ...(!isPro ? [[Markup.button.callback('⭐ Go Pro', 'buy_pro')]] : []),
        ]),
      }
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// /help — Command list
// ─────────────────────────────────────────────────────────────────────────────
bot.command('help', async (ctx) => {
  await ctx.reply(
    `*SplitMate Commands:*\n\n` +
    `/start — Main menu\n` +
    `/newgroup — Create a new expense group\n` +
    `/groups — List your groups\n` +
    `/balances — Check balances in your groups\n` +
    `/upgrade — Upgrade to Pro (⭐ Stars)\n` +
    `/pro — Check your Pro status\n\n` +
    `*Pro Features:*\n` +
    `• Unlimited groups\n` +
    `• Multi-currency\n` +
    `• Receipt scanning\n` +
    `• TON settlements\n` +
    `• Automated reminders`,
    { parse_mode: 'Markdown' }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// /groups — List user's groups with quick access buttons
// ─────────────────────────────────────────────────────────────────────────────
bot.command('groups', async (ctx) => {
  const groups = await getUserGroups(ctx.from.id);

  if (groups.length === 0) {
    return ctx.reply(
      "You're not in any groups yet.\n\nCreate one with /newgroup or ask someone to share their invite link!",
      Markup.inlineKeyboard([
        Markup.button.webApp('💸 Open SplitMate', config.MINI_APP_URL),
      ])
    );
  }

  const groupList = groups
    .map((g, i) => {
      const net = parseFloat(g.total_lent) - parseFloat(g.total_owed);
      const netStr = net > 0
        ? `+${net.toFixed(2)} ${g.currency} (you're owed)`
        : net < 0
        ? `${net.toFixed(2)} ${g.currency} (you owe)`
        : `settled up ✅`;
      return `${i + 1}. *${g.name}* — ${g.member_count} members\n   ${netStr}`;
    })
    .join('\n\n');

  await ctx.reply(
    `*Your Groups:*\n\n${groupList}\n\n_Tap below to manage expenses:_`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        Markup.button.webApp('💸 Open SplitMate', config.MINI_APP_URL),
      ]),
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// /balances — Quick balance summary across all groups
// ─────────────────────────────────────────────────────────────────────────────
bot.command('balances', async (ctx) => {
  const groups = await getUserGroups(ctx.from.id);

  if (groups.length === 0) {
    return ctx.reply("You're not in any groups yet. Use /newgroup to start!");
  }

  let message = '*Your Balances:*\n\n';
  let totalOwed = 0;
  let totalLent = 0;

  for (const group of groups) {
    const owed = parseFloat(group.total_owed);
    const lent = parseFloat(group.total_lent);
    totalOwed += owed;
    totalLent += lent;

    const net = lent - owed;
    const netStr = net > 0 ? `✅ +${net.toFixed(2)}` : net < 0 ? `❗ ${net.toFixed(2)}` : `✓ settled`;
    message += `*${group.name}:* ${netStr} ${group.currency}\n`;
  }

  const totalNet = totalLent - totalOwed;
  message += `\n*Overall:* ${totalNet >= 0 ? '+' : ''}${totalNet.toFixed(2)} USD`;

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      Markup.button.webApp('💸 View Details', config.MINI_APP_URL),
    ]),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /upgrade — Trigger the Pro upgrade flow
// ─────────────────────────────────────────────────────────────────────────────
bot.command('upgrade', async (ctx) => {
  const isPro = await isProUser(ctx.from.id);

  if (isPro) {
    return ctx.reply(
      '⭐ You already have *SplitMate Pro*! Enjoy unlimited features.',
      { parse_mode: 'Markdown' }
    );
  }

  await ctx.reply(
    `⭐ *Upgrade to SplitMate Pro*\n\n` +
    `Unlock the full SplitMate experience for just *${config.PRO_MONTHLY_STARS} Stars/month*:\n\n` +
    `✅ Unlimited groups\n` +
    `✅ Multi-currency (20+ currencies)\n` +
    `✅ Receipt scanning via photo\n` +
    `✅ TON wallet settlements\n` +
    `✅ Automated debt reminders\n` +
    `✅ CSV export\n` +
    `✅ Recurring bills\n\n` +
    `Tap below to pay with Telegram Stars:`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('⭐ Pay with Stars', 'buy_pro')],
        [Markup.button.webApp('💸 Open App', config.MINI_APP_URL)],
      ]),
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// /pro — Check Pro subscription status
// ─────────────────────────────────────────────────────────────────────────────
bot.command('pro', async (ctx) => {
  const isPro = await isProUser(ctx.from.id);
  if (isPro) {
    await ctx.reply('⭐ Your SplitMate Pro subscription is *active*! 🎉', { parse_mode: 'Markdown' });
  } else {
    await ctx.reply(
      `You're on the *Free plan*.\n\nUpgrade with /upgrade to unlock unlimited groups, multi-currency, and more!`,
      { parse_mode: 'Markdown' }
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Callback query handlers
// ─────────────────────────────────────────────────────────────────────────────
bot.action('buy_pro', async (ctx) => {
  await ctx.answerCbQuery();
  await sendProInvoice(ctx.from.id);
});

bot.action('how_it_works', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    `*How SplitMate works* 💸\n\n` +
    `*Step 1 — Create a group*\n` +
    `Give it a name (e.g. "Bali Trip 🌴" or "Flat expenses"). Invite friends via a link.\n\n` +
    `*Step 2 — Log expenses*\n` +
    `Tap ✚, enter who paid and how much. SplitMate handles the math.\n\n` +
    `*Step 3 — Check balances*\n` +
    `See exactly who owes who at any time. No spreadsheets needed.\n\n` +
    `*Step 4 — Settle up*\n` +
    `Pay via Telegram Wallet (TON), crypto, or just mark it as paid manually.\n\n` +
    `_No awkward "hey you owe me from last week" convos_ 😅`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 Get Started', config.MINI_APP_URL)],
      ]),
    }
  );
});

bot.action('quick_balances', async (ctx) => {
  await ctx.answerCbQuery();
  const { getUserGroups: getGroups } = await import('../services/groupService.js');
  const groups = await getGroups(ctx.from.id);

  if (groups.length === 0) {
    return ctx.editMessageText(
      "You're not in any groups yet. Tap below to create one!",
      Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 Create First Group', config.MINI_APP_URL)],
      ])
    );
  }

  let msg = '*Your Balances* 📊\n\n';
  let totalNet = 0;
  for (const g of groups) {
    const net = parseFloat(g.total_lent || 0) - parseFloat(g.total_owed || 0);
    totalNet += net;
    const icon = net > 0 ? '💚' : net < 0 ? '🔴' : '✅';
    const label = net > 0 ? `+${net.toFixed(2)} owed to you` : net < 0 ? `${net.toFixed(2)} you owe` : 'settled';
    msg += `${icon} *${g.name}*: ${label} ${g.currency}\n`;
  }

  const netIcon = totalNet > 0 ? '💚' : totalNet < 0 ? '🔴' : '✅';
  msg += `\n${netIcon} *Overall: ${totalNet >= 0 ? '+' : ''}${totalNet.toFixed(2)}*`;

  await ctx.editMessageText(msg, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.webApp('💸 Open SplitMate', config.MINI_APP_URL)],
    ]),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Payment handlers — CRITICAL for monetization
// ─────────────────────────────────────────────────────────────────────────────

// Step 5: Telegram asks us to approve the payment before charging
bot.on('pre_checkout_query', async (ctx) => {
  await handlePreCheckoutQuery(ctx.preCheckoutQuery);
});

// Step 6: Payment completed — grant Pro access
bot.on('message', async (ctx, next) => {
  if (ctx.message?.successful_payment) {
    await handleSuccessfulPayment(ctx.message);
    return;
  }
  return next();
});

// ─────────────────────────────────────────────────────────────────────────────
// When bot is added to a group — auto-setup greeting
// ─────────────────────────────────────────────────────────────────────────────
bot.on('my_chat_member', async (ctx) => {
  const { new_chat_member, chat } = ctx.myChatMember;
  if (new_chat_member.status === 'member' && chat.type !== 'private') {
    await ctx.reply(
      `👋 Hey! I'm *SplitMate* — your group expense tracker.\n\n` +
      `Add me to split bills, track shared costs, and settle debts right here in this group.\n\n` +
      `One person should tap below to set up a SplitMate group for *${chat.title}*:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          Markup.button.webApp('💸 Set up SplitMate', config.MINI_APP_URL),
        ]),
      }
    );
  }
});

export default bot;
