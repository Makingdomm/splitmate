import { supabase } from '../db/client.js';

export const upsertUser = async ({ telegram_id, username, full_name, photo_url }) => {
  const { data, error } = await supabase
    .from('users')
    .upsert({ telegram_id, username, full_name, photo_url, updated_at: new Date().toISOString() },
             { onConflict: 'telegram_id' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const getUserByTelegramId = async (telegramId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
};

export const isProUser = async (telegramId) => {
  const { data, error } = await supabase
    .from('users')
    .select('pro_status, pro_expires_at')
    .eq('telegram_id', telegramId)
    .maybeSingle();
  if (error || !data) return false;
  if (!data.pro_status) return false;
  if (data.pro_expires_at && new Date(data.pro_expires_at) < new Date()) {
    await supabase.from('users').update({ pro_status: false }).eq('telegram_id', telegramId);
    return false;
  }
  return true;
};

export const activateProSubscription = async (telegramId) => {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('users')
    .update({ pro_status: true, pro_expires_at: expiresAt, updated_at: new Date().toISOString() })
    .eq('telegram_id', telegramId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const updateTonWallet = async (telegramId, walletAddress) => {
  const { data, error } = await supabase
    .from('users')
    .update({ ton_wallet: walletAddress, updated_at: new Date().toISOString() })
    .eq('telegram_id', telegramId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const countUserGroups = async (telegramId) => {
  const { count, error } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', telegramId);
  if (error) throw new Error(error.message);
  return count || 0;
};
