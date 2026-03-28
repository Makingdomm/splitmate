// =============================================================================
// store/appStore.js — Global app state with Zustand
// Keeps groups, active group, expenses, and user Pro status in sync
// =============================================================================

import { create } from 'zustand';
import api from '../utils/api.js';

const useAppStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  user:          null,    // Telegram user object from WebApp
  groups:        [],      // User's expense groups
  activeGroup:   null,    // Currently selected group
  expenses:      [],      // Expenses for active group
  balances:      null,    // Balance/debt data for active group
  paymentStatus: null,    // Pro subscription status
  loading:       false,
  error:         null,

  // ── User ───────────────────────────────────────────────────────────────────
  initUser: () => {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    set({ user: tgUser });
  },

  // ── Groups ─────────────────────────────────────────────────────────────────
  fetchGroups: async () => {
    set({ loading: true, error: null });
    try {
      const { groups } = await api.groups.list();
      set({ groups, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  setActiveGroup: async (group) => {
    set({ activeGroup: group, expenses: [], balances: null, loading: true });
    try {
      const [{ expenses }, { balances }] = await Promise.all([
        api.expenses.list(group.id, 20, 0),
        api.groups.balances(group.id),
      ]);
      set({ expenses, balances, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  createGroup: async (data) => {
    const { group } = await api.groups.create(data);
    set(state => ({ groups: [group, ...state.groups] }));
    return group;
  },

  joinGroup: async (inviteCode) => {
    const result = await api.groups.join(inviteCode);
    await get().fetchGroups();
    return result;
  },

  // ── Expenses ───────────────────────────────────────────────────────────────
  addExpense: async (data) => {
    const result = await api.expenses.add(data);
    // Refresh expenses and balances after adding
    const activeGroup = get().activeGroup;
    if (activeGroup) {
      await get().setActiveGroup(activeGroup);
    }
    await get().fetchGroups();
    return result;
  },

  settleDebt: async (data) => {
    const result = await api.expenses.settle(data);
    const activeGroup = get().activeGroup;
    if (activeGroup) {
      await get().setActiveGroup(activeGroup);
    }
    await get().fetchGroups();
    return result;
  },

  deleteExpense: async (expenseId) => {
    await api.expenses.delete(expenseId);
    set(state => ({
      expenses: state.expenses.filter(e => e.id !== expenseId),
    }));
    const activeGroup = get().activeGroup;
    if (activeGroup) {
      const { balances } = await api.groups.balances(activeGroup.id);
      set({ balances });
    }
  },

  // ── Payments ───────────────────────────────────────────────────────────────
  fetchPaymentStatus: async () => {
    try {
      const status = await api.payments.status();
      set({ paymentStatus: status });
      return status;
    } catch (err) {
      console.error('Failed to fetch payment status:', err);
    }
  },

  upgradeToProMessage: async () => {
    // Sends invoice via bot — user completes payment in Telegram
    await api.payments.upgrade();
    // Show hint to check Telegram chat
    window.Telegram?.WebApp?.showAlert(
      '✅ Invoice sent! Check your Telegram chat to complete payment with Stars.'
    );
  },

  // ── UI helpers ─────────────────────────────────────────────────────────────
  clearError: () => set({ error: null }),
}));

export default useAppStore;
