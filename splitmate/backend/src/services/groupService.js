import { supabase } from '../db/client.js';
import { nanoid } from 'nanoid';

export const createGroup = async ({ name, description, createdBy, currency = 'USD', telegramChatId = null }) => {
  const inviteCode = nanoid(8);

  const { data: group, error: gErr } = await supabase
    .from('groups')
    .insert({ name, description, created_by: createdBy, currency, invite_code: inviteCode, telegram_chat_id: telegramChatId })
    .select()
    .single();
  if (gErr) throw new Error(gErr.message);

  const { error: mErr } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: createdBy, role: 'admin' });
  if (mErr) throw new Error(mErr.message);

  return group;
};

export const getGroupById = async (groupId) => {
  const { data, error } = await supabase
    .from('groups')
    .select('*, group_members(count)')
    .eq('id', groupId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
};

export const getGroupByInviteCode = async (inviteCode) => {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('invite_code', inviteCode)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
};

export const getUserGroups = async (telegramId) => {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      role, joined_at,
      groups (*)
    `)
    .eq('user_id', telegramId)
    .eq('groups.is_active', true);
  if (error) throw new Error(error.message);
  return data.filter(m => m.groups).map(m => ({ ...m.groups, role: m.role, joined_at: m.joined_at }));
};

export const getGroupMembers = async (groupId) => {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      role, joined_at,
      users (telegram_id, username, full_name, photo_url, ton_wallet)
    `)
    .eq('group_id', groupId)
    .order('joined_at');
  if (error) throw new Error(error.message);
  return data.map(m => ({ ...m.users, role: m.role, joined_at: m.joined_at }));
};

export const joinGroup = async (groupId, telegramId) => {
  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', telegramId)
    .maybeSingle();
  if (existing) throw new Error('ALREADY_MEMBER');

  const { error } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: telegramId, role: 'member' });
  if (error) throw new Error(error.message);
};

export const isMember = async (groupId, telegramId) => {
  const { data } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', telegramId)
    .maybeSingle();
  return !!data;
};
