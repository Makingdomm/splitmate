// =============================================================================
// services/groupService.js — Group creation, membership, and invite logic
// =============================================================================

import { query, transaction } from '../db/client.js';
import { nanoid } from 'nanoid';

// ─────────────────────────────────────────────────────────────────────────────
// createGroup — Create a new expense group and add creator as admin
// ─────────────────────────────────────────────────────────────────────────────
export const createGroup = async ({ name, description, createdBy, currency = 'USD', telegramChatId = null }) => {
  return await transaction(async (client) => {
    // Generate a short, unique invite code (e.g. "abc123XY")
    const inviteCode = nanoid(8);

    // Create the group
    const groupResult = await client.query(
      `INSERT INTO groups (name, description, created_by, currency, invite_code, telegram_chat_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, description, createdBy, currency, inviteCode, telegramChatId]
    );
    const group = groupResult.rows[0];

    // Add creator as admin member
    await client.query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, 'admin')`,
      [group.id, createdBy]
    );

    return group;
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// getGroupById — Fetch a group with member count
// ─────────────────────────────────────────────────────────────────────────────
export const getGroupById = async (groupId) => {
  const result = await query(
    `SELECT g.*, COUNT(gm.user_id) AS member_count
     FROM groups g
     LEFT JOIN group_members gm ON gm.group_id = g.id
     WHERE g.id = $1 AND g.is_active = TRUE
     GROUP BY g.id`,
    [groupId]
  );
  return result.rows[0] || null;
};

// ─────────────────────────────────────────────────────────────────────────────
// getGroupByInviteCode — Used for deep-link joins
// ─────────────────────────────────────────────────────────────────────────────
export const getGroupByInviteCode = async (inviteCode) => {
  const result = await query(
    'SELECT * FROM groups WHERE invite_code = $1 AND is_active = TRUE',
    [inviteCode]
  );
  return result.rows[0] || null;
};

// ─────────────────────────────────────────────────────────────────────────────
// getUserGroups — All groups a user belongs to, with balance summary
// ─────────────────────────────────────────────────────────────────────────────
export const getUserGroups = async (telegramId) => {
  const result = await query(
    `SELECT
       g.*,
       gm.role,
       gm.joined_at,
       COUNT(DISTINCT gm2.user_id) AS member_count,
       COALESCE(SUM(
         CASE WHEN es.user_id = $1 AND es.is_settled = FALSE THEN es.amount_owed ELSE 0 END
       ), 0) AS total_owed,
       COALESCE(SUM(
         CASE WHEN e.paid_by = $1 AND es2.is_settled = FALSE AND es2.user_id != $1
              THEN es2.amount_owed ELSE 0 END
       ), 0) AS total_lent
     FROM groups g
     JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
     LEFT JOIN group_members gm2 ON gm2.group_id = g.id
     LEFT JOIN expenses e ON e.group_id = g.id
     LEFT JOIN expense_splits es ON es.expense_id = e.id AND es.user_id = $1
     LEFT JOIN expense_splits es2 ON es2.expense_id = e.id
     WHERE g.is_active = TRUE
     GROUP BY g.id, gm.role, gm.joined_at
     ORDER BY g.created_at DESC`,
    [telegramId]
  );
  return result.rows;
};

// ─────────────────────────────────────────────────────────────────────────────
// getGroupMembers — All members of a group with their user details
// ─────────────────────────────────────────────────────────────────────────────
export const getGroupMembers = async (groupId) => {
  const result = await query(
    `SELECT u.telegram_id, u.username, u.full_name, u.photo_url,
            u.ton_wallet, gm.role, gm.joined_at
     FROM group_members gm
     JOIN users u ON u.telegram_id = gm.user_id
     WHERE gm.group_id = $1
     ORDER BY gm.joined_at ASC`,
    [groupId]
  );
  return result.rows;
};

// ─────────────────────────────────────────────────────────────────────────────
// joinGroup — Add a user to a group (with free tier check)
// ─────────────────────────────────────────────────────────────────────────────
export const joinGroup = async (groupId, telegramId) => {
  // Check if already a member
  const existing = await query(
    'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, telegramId]
  );
  if (existing.rows.length > 0) {
    throw new Error('ALREADY_MEMBER');
  }

  await query(
    `INSERT INTO group_members (group_id, user_id, role)
     VALUES ($1, $2, 'member')`,
    [groupId, telegramId]
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// isMember — Check if a user belongs to a group
// ─────────────────────────────────────────────────────────────────────────────
export const isMember = async (groupId, telegramId) => {
  const result = await query(
    'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, telegramId]
  );
  return result.rows.length > 0;
};
