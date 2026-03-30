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

// ── Wallet management ──────────────────────────────────────────────────────

export const SUPPORTED_CHAINS = [
  { id: 'TON',     label: 'TON Wallet',  chain: 'TON Blockchain', icon: 'TON' },
  { id: 'BTC',     label: 'Bitcoin',     chain: 'Bitcoin',        icon: 'BTC' },
  { id: 'ETH',     label: 'Ethereum',    chain: 'ERC-20',         icon: 'ETH' },
  { id: 'SOL',     label: 'Solana',      chain: 'Solana',         icon: 'SOL' },
  { id: 'BNB',     label: 'BNB Chain',   chain: 'BEP-20',         icon: 'BNB' },
  { id: 'USDT_TRC',label: 'USDT',        chain: 'TRC-20',         icon: 'USDT' },
  { id: 'USDT_ERC',label: 'USDT',        chain: 'ERC-20',         icon: 'USDT' },
  { id: 'MATIC',   label: 'Polygon',     chain: 'Polygon',        icon: 'MATIC' },
  { id: 'AVAX',    label: 'Avalanche',   chain: 'C-Chain',        icon: 'AVAX' },
  { id: 'ADA',     label: 'Cardano',     chain: 'Cardano',        icon: 'ADA' },
  { id: 'DOT',     label: 'Polkadot',    chain: 'Polkadot',       icon: 'DOT' },
  { id: 'XRP',     label: 'XRP',         chain: 'XRP Ledger',     icon: 'XRP' },
  { id: 'LTC',     label: 'Litecoin',    chain: 'Litecoin',       icon: 'LTC' },
  { id: 'DOGE',    label: 'Dogecoin',    chain: 'Dogecoin',       icon: 'DOGE' },
  { id: 'TRX',     label: 'TRON',        chain: 'TRON',           icon: 'TRX' },
];

export const getUserWallets = async (telegramId) => {
  const { data, error } = await supabase
    .from('user_wallets')
    .select('*')
    .eq('telegram_id', telegramId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
};

export const saveUserWallets = async (telegramId, wallets) => {
  // Delete existing and re-insert (simple upsert approach)
  await supabase.from('user_wallets').delete().eq('telegram_id', telegramId);

  if (!wallets || wallets.length === 0) return [];

  const rows = wallets.map(w => ({
    telegram_id: telegramId,
    chain: w.chain || w.id,
    address: w.address,
    label: w.label || w.chain || w.id,
  }));

  const { data, error } = await supabase
    .from('user_wallets')
    .insert(rows)
    .select();
  if (error) throw new Error(error.message);
  return data;
};

// Alias for backwards compatibility
export const upsertUser = getOrCreateUser;
