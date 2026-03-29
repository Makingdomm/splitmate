// =============================================================================
// utils/api.js — Centralized API client
// Automatically attaches Telegram initData to every request for authentication
// =============================================================================

const API_URL = import.meta.env.VITE_API_URL || 'https://splitmate-production-9382.up.railway.app';

// ─────────────────────────────────────────────────────────────────────────────
// getInitData — Get the raw initData string from Telegram WebApp
// This is signed by Telegram and verified server-side
// ─────────────────────────────────────────────────────────────────────────────
const getInitData = () => {
  return window.Telegram?.WebApp?.initData || '';
};

// ─────────────────────────────────────────────────────────────────────────────
// request — Base fetch wrapper with auth headers and error handling
// ─────────────────────────────────────────────────────────────────────────────
const request = async (method, path, body = null) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-telegram-init-data': getInitData(), // Auth header
    },
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${path}`, options);
  const data = await response.json();

  if (!response.ok) {
    // Throw a structured error so components can handle specific codes
    const error = new Error(data.message || data.error || 'Request failed');
    error.code = data.error;
    error.status = response.status;
    throw error;
  }

  return data;
};

// ─────────────────────────────────────────────────────────────────────────────
// API methods — typed interface for all backend endpoints
// ─────────────────────────────────────────────────────────────────────────────
export const api = {
  // Groups
  groups: {
    list:     ()           => request('GET',  '/api/groups'),
    get:      (id)         => request('GET',  `/api/groups/${id}`),
    create:   (data)       => request('POST', '/api/groups', data),
    balances: (id)         => request('GET',  `/api/groups/${id}/balances`),
    join:     (inviteCode) => request('POST', '/api/groups/join', { inviteCode }),
    preview:  (code)       => request('GET',  `/api/groups/invite/${code}`),
    delete:   (id)         => request('DELETE', `/api/groups/${id}`),
  },

  // Expenses
  expenses: {
    list:    (groupId, limit, offset) =>
      request('GET', `/api/expenses/${groupId}?limit=${limit}&offset=${offset}`),
    add:     (data)   => request('POST',   '/api/expenses', data),
    settle:  (data)   => request('POST',   '/api/expenses/settle', data),
    delete:  (id)     => request('DELETE', `/api/expenses/${id}`),
  },

  // Wallets
  wallets: {
    mine:      ()           => request('GET', '/api/wallets'),
    save:      (wallets)    => request('PUT', '/api/wallets', { wallets }),
    ofUser:    (telegramId) => request('GET', `/api/wallets/user/${telegramId}`),
    chains:    ()           => request('GET', '/api/wallets/chains'),
  },

  // Payments
  receipts: {
    scan: (image, mimeType) => request('POST', '/api/receipts/scan', { image, mimeType }),
  },
  payments: {
    status:     ()     => request('GET',  '/api/payments/status'),
    upgrade:    (starsAmount) => request('POST', '/api/payments/invoice', { starsAmount }),
    currencies: ()     => request('GET',  '/api/payments/currencies'),
  },
  // TON payments
  ton: {
    price:      ()                          => request('GET',  '/api/ton/price'),
    proLink:    (tier)                      => request('POST', '/api/ton/pro-link', { tier }),
    verifyPro:  (senderAddress)             => request('POST', '/api/ton/verify-pro', { senderAddress }),
    balance:    (address)                   => request('GET',  `/api/ton/balance/${address}`),
  },

};

export default api;
