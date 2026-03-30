// =============================================================================
// utils/api.js — Centralized API client
// =============================================================================

const API_URL = import.meta.env.VITE_API_URL || 'https://splitmate-production-9382.up.railway.app';

const getInitData = () => window.Telegram?.WebApp?.initData || '';

const request = async (method, path, body = null) => {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': getInitData() },
  };
  if (body && method !== 'GET') options.body = JSON.stringify(body);

  const response = await fetch(`${API_URL}${path}`, options);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || data.error || 'Request failed');
    error.code = data.error;
    error.status = response.status;
    throw error;
  }
  return data;
};

export const api = {
  groups: {
    list:     ()           => request('GET',    '/api/groups'),
    get:      (id)         => request('GET',    `/api/groups/${id}`),
    create:   (data)       => request('POST',   '/api/groups', data),
    balances: (id)         => request('GET',    `/api/groups/${id}/balances`),
    join:     (inviteCode) => request('POST',   '/api/groups/join', { inviteCode }),
    preview:  (code)       => request('GET',    `/api/groups/invite/${code}`),
    delete:   (id)         => request('DELETE', `/api/groups/${id}`),
  },
  expenses: {
    list:      (groupId, limit, offset) => request('GET', `/api/expenses/${groupId}?limit=${limit}&offset=${offset}`),
    add:       (data)     => request('POST',   '/api/expenses', data),
    settle:    (data)     => request('POST',   '/api/expenses/settle', data),
    delete:    (id)       => request('DELETE', `/api/expenses/${id}`),
    export:    (groupId)  => request('GET',    `/api/expenses/${groupId}/export`),
    analytics: (groupId)  => request('GET',    `/api/expenses/${groupId}/analytics`),
    setRecurring: (id, data) => request('PATCH', `/api/expenses/${id}/recurring`, data),
  },
  comments: {
    list:   (expenseId) => request('GET',    `/api/comments/${expenseId}`),
    add:    (data)      => request('POST',   '/api/comments', data),
    delete: (id)        => request('DELETE', `/api/comments/${id}`),
  },
  wallets: {
    mine:   ()           => request('GET', '/api/wallets'),
    save:   (wallets)    => request('PUT', '/api/wallets', { wallets }),
    ofUser: (telegramId) => request('GET', `/api/wallets/user/${telegramId}`),
    chains: ()           => request('GET', '/api/wallets/chains'),
  },
  receipts: {
    scan: (image, mimeType) => request('POST', '/api/receipts/scan', { image, mimeType }),
  },
  payments: {
    status:     ()            => request('GET',  '/api/payments/status'),
    upgrade:    (starsAmount) => request('POST', '/api/payments/invoice', { starsAmount }),
    currencies: ()            => request('GET',  '/api/payments/currencies'),
  },
  ton: {
    price:     ()               => request('GET',  '/api/ton/price'),
    proLink:   (tier)           => request('POST', '/api/ton/pro-link', { tier }),
    verifyPro: (senderAddress)  => request('POST', '/api/ton/verify-pro', { senderAddress }),
    balance:   (address)        => request('GET',  `/api/ton/balance/${address}`),
  },
};

export default api;
