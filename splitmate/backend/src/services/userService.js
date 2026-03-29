import { supabase } from '../db/client.js';

export const getOrCreateUser = async (telegramUser) => {
  const { id: telegram_id, username, first_name, last_name, photo_url } = telegramUser;
  const full_name = [first_name, last_name].filter(Boolean).join(' ');

  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegram_id)
    .single();

  if (existing) {
    const { data } = await supabase
      .from('users')
      .update({ username, full_name, photo_url, updated_at: new Date().toISOString() })
      .eq('telegram_id', telegram_id)
      .select()
      .single();
    return data;
  }

  const { data, error } = await supabase
    .from('users')
    .insert({ telegram_id, username, full_name, photo_url })
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
    .single();
  if (error) return null;
  return data;
};

export const activateProSubscription = async (telegramId, tier = 'standard') => {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('users')
    .update({
      pro_status: true,
      pro_tier: tier,
      pro_expires_at: expiresAt,
      updated_at: new Date().toISOString()
    })
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

export const isProUser = async (telegramId) => {
  const user = await getUserByTelegramId(telegramId);
  if (!user) return false;
  if (!user.pro_status) return false;
  if (user.pro_expires_at && new Date(user.pro_expires_at) < new Date()) return false;
  return true;
};
