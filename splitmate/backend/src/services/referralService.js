import { supabase } from '../db/client.js';

const generateCode = (telegramId) => {
  const base = telegramId.toString(36).toUpperCase();
  const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `SM${base}${suffix}`;
};

export const getOrCreateReferralCode = async (telegramId) => {
  const { data: user } = await supabase
    .from('users').select('referral_code').eq('telegram_id', telegramId).single();
  if (user?.referral_code) return user.referral_code;

  let code;
  let attempts = 0;
  while (attempts < 10) {
    code = generateCode(telegramId);
    const { data: existing } = await supabase
      .from('users').select('telegram_id').eq('referral_code', code).single();
    if (!existing) break;
    attempts++;
  }
  await supabase.from('users').update({ referral_code: code }).eq('telegram_id', telegramId);
  return code;
};

export const getReferralStats = async (telegramId) => {
  const code = await getOrCreateReferralCode(telegramId);

  const { count: totalCount } = await supabase
    .from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', telegramId);
  const { count: successCount } = await supabase
    .from('referrals').select('*', { count: 'exact', head: true })
    .eq('referrer_id', telegramId).eq('status', 'rewarded');
  const { count: pendingCount } = await supabase
    .from('referrals').select('*', { count: 'exact', head: true })
    .eq('referrer_id', telegramId).eq('status', 'pending');

  return {
    referral_code: code,
    total_referrals: totalCount || 0,
    successful_referrals: successCount || 0,
    pending_referrals: pendingCount || 0,
    free_months_earned: successCount || 0,
  };
};

export const recordReferral = async (newUserTelegramId, referralCode) => {
  if (!referralCode) return null;
  const { data: referrer } = await supabase
    .from('users').select('telegram_id').eq('referral_code', referralCode).single();
  if (!referrer) return null;
  if (referrer.telegram_id === newUserTelegramId) return null;

  const { data: existing } = await supabase
    .from('referrals').select('id').eq('referred_id', newUserTelegramId).single();
  if (existing) return null;

  const { data, error } = await supabase
    .from('referrals')
    .insert({ referrer_id: referrer.telegram_id, referred_id: newUserTelegramId, referral_code: referralCode, status: 'pending' })
    .select().single();
  if (error) throw new Error(error.message);

  await supabase.from('users').update({ referred_by: referrer.telegram_id }).eq('telegram_id', newUserTelegramId);
  return data;
};

export const grantReferralReward = async (referredTelegramId) => {
  const { data: referral } = await supabase
    .from('referrals').select('*')
    .eq('referred_id', referredTelegramId).eq('status', 'pending').single();
  if (!referral) return null;

  await supabase.from('referrals')
    .update({ status: 'rewarded', reward_granted_at: new Date().toISOString() })
    .eq('id', referral.id);

  const { data: referrer } = await supabase
    .from('users').select('pro_status, pro_expires_at, pro_tier')
    .eq('telegram_id', referral.referrer_id).single();

  const now = new Date();
  const base = referrer?.pro_status && referrer?.pro_expires_at && new Date(referrer.pro_expires_at) > now
    ? new Date(referrer.pro_expires_at) : now;
  const newExpiry = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await supabase.from('users').update({
    pro_status: true,
    pro_tier: referrer?.pro_tier || 'standard',
    pro_expires_at: newExpiry,
    updated_at: new Date().toISOString(),
  }).eq('telegram_id', referral.referrer_id);

  return { referrer_id: referral.referrer_id, new_expiry: newExpiry };
};
