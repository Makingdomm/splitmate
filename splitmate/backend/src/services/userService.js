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

// ── Crypto wallet management ─────────────────────────────────────────────────

export const SUPPORTED_CHAINS = [
  { id: 'TON',       label: 'TON',            icon: '💎', placeholder: 'EQA...' },
  { id: 'ETH',       label: 'Ethereum (ETH)', icon: '⟠',  placeholder: '0x...' },
  { id: 'BTC',       label: 'Bitcoin (BTC)',  icon: '₿',  placeholder: 'bc1q...' },
  { id: 'USDT_TRC20',label: 'USDT (TRC-20)',  icon: '💵', placeholder: 'T...' },
  { id: 'USDT_ERC20',label: 'USDT (ERC-20)',  icon: '💵', placeholder: '0x...' },
  { id: 'SOL',       label: 'Solana (SOL)',   icon: '◎',  placeholder: '...' },
  { id: 'BNB',       label: 'BNB (BSC)',      icon: '🟡', placeholder: '0x...' },
];

export const getUserWallets = async (telegramId) => {
  const { data, error } = await supabase
    .from('users')
    .select('crypto_wallets, ton_wallet')
    .eq('telegram_id', telegramId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  // Merge legacy ton_wallet into crypto_wallets
  const wallets = Array.isArray(data?.crypto_wallets) ? data.crypto_wallets : [];
  if (data?.ton_wallet && !wallets.find(w => w.chain === 'TON')) {
    wallets.unshift({ chain: 'TON', address: data.ton_wallet, label: 'TON Wallet' });
  }
  return wallets;
};

export const saveUserWallets = async (telegramId, wallets) => {
  // Validate: max 10 wallets, address max 200 chars
  if (!Array.isArray(wallets)) throw new Error('Invalid wallets data');
  if (wallets.length > 10) throw new Error('Maximum 10 wallets allowed');
  const validChainIds = SUPPORTED_CHAINS.map(c => c.id);
  for (const w of wallets) {
    if (!validChainIds.includes(w.chain)) throw new Error(`Unknown chain: ${w.chain}`);
    if (!w.address || typeof w.address !== 'string') throw new Error('Missing wallet address');
    if (w.address.length > 200) throw new Error('Address too long');
    if (w.label && w.label.length > 50) throw new Error('Label too long');
  }

  const { data, error } = await supabase
    .from('users')
    .update({ crypto_wallets: wallets, updated_at: new Date().toISOString() })
    .eq('telegram_id', telegramId)
    .select('crypto_wallets')
    .single();
  if (error) throw new Error(error.message);
  return data.crypto_wallets;
};
