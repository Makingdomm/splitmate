// =============================================================================
// App.jsx — Root component with routing and theme setup
// Uses Telegram's native color scheme for seamless UI integration
// Telemetree analytics integrated — swap in real PROJECT_ID + API_KEY from
// https://builders.ton.org → Analytics tab
// =============================================================================

import React, { useEffect, useState } from 'react';
import useAppStore from './store/appStore.js';
import GroupList from './pages/GroupList.jsx';
import GroupDetail from './pages/GroupDetail.jsx';
import AddExpense from './pages/AddExpense.jsx';
import SettleUp         from './pages/SettleUp.jsx';
import WalletSettings  from './pages/WalletSettings.jsx';
import ProUpgrade from './pages/ProUpgrade.jsx';
import CreateGroup from './pages/CreateGroup.jsx';
import JoinGroup from './pages/JoinGroup.jsx';
import BottomNav from './components/BottomNav.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import Toast from './components/Toast.jsx';

// ── Telemetree Analytics ───────────────────────────────────────────────────
// These values come from TON Builders → your project → Analytics tab
const TELEMETREE_PROJECT_ID = import.meta.env.VITE_TELEMETREE_PROJECT_ID || '';
const TELEMETREE_API_KEY    = import.meta.env.VITE_TELEMETREE_API_KEY    || '';

// Lazy-load the SDK so it never blocks the app from rendering
let twaAnalytics = null;
async function initAnalytics(telegramData) {
  if (!TELEMETREE_PROJECT_ID || !TELEMETREE_API_KEY) return;
  try {
    const { TwaAnalyticsProvider } = await import('@tonsolutions/telemetree-react');
    twaAnalytics = TwaAnalyticsProvider;
    console.log('[Analytics] Telemetree initialized');
  } catch (e) {
    console.warn('[Analytics] Telemetree SDK not loaded:', e.message);
  }
}

export default function App() {
  const { initUser, fetchGroups, fetchPaymentStatus, loading, error, clearError } = useAppStore();
  const [page, setPage] = useState('groups');
  const [pageHistory, setPageHistory] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [telegramData, setTelegramData] = useState(null);

  const navigateTo = (target) => {
    if (target === -1) {
      setPageHistory(prev => {
        const newHistory = [...prev];
        const prev_page = newHistory.pop() || 'groups';
        setPage(prev_page);
        return newHistory;
      });
    } else {
      setPageHistory(prev => [...prev, page]);
      setPage(target);
    }
  };
  const [toast, setToast] = useState(null);

  // ── Bootstrap the app ──────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      initUser();

      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();

        // Collect Telegram init data for analytics
        const initData = tg.initDataUnsafe || {};
        const tgData = {
          query_id:      initData.query_id,
          user:          initData.user,
          chat_type:     initData.chat_type,
          chat_instance: initData.chat_instance,
          start_param:   initData.start_param,
          auth_date:     initData.auth_date,
          hash:          initData.hash,
          platform:      tg.platform,
        };
        setTelegramData(tgData);
        initAnalytics(tgData);
      }

      try {
        await Promise.all([fetchGroups(), fetchPaymentStatus()]);
      } catch (err) {
        console.warn('Init fetch failed (likely no initData yet):', err.message);
      }

      setInitialized(true);
    };
    init();

    // Apply Telegram's theme colors as CSS variables
    const tg = window.Telegram?.WebApp;
    if (tg) {
      const root = document.documentElement;
      root.style.setProperty('--tg-bg',          tg.backgroundColor || '#18181b');
      root.style.setProperty('--tg-secondary-bg', tg.secondaryBackgroundColor || '#27272a');
      root.style.setProperty('--tg-text',         tg.themeParams?.text_color || '#ffffff');
      root.style.setProperty('--tg-hint',         tg.themeParams?.hint_color || '#a1a1aa');
      root.style.setProperty('--tg-link',         tg.themeParams?.link_color || '#6366f1');
      root.style.setProperty('--tg-button',       tg.themeParams?.button_color || '#6366f1');
      root.style.setProperty('--tg-button-text',  tg.themeParams?.button_text_color || '#ffffff');
    }
  }, []);

  // Show toast on non-auth errors
  useEffect(() => {
    if (error) {
      const isAuthError = error.toLowerCase().includes('unauthorized') ||
                          error.toLowerCase().includes('missing auth') ||
                          error.toLowerCase().includes('pattern');
      if (!isAuthError) {
        setToast({ type: 'error', message: error });
      }
      clearError();
    }
  }, [error]);

  if (!initialized) return <LoadingScreen />;

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Page renderer ──────────────────────────────────────────────────────────
  const renderPage = () => {
    switch (page) {
      case 'groups':        return <GroupList onNavigate={navigateTo} onToast={showToast} />;
      case 'group-detail':  return <GroupDetail onNavigate={navigateTo} onToast={showToast} />;
      case 'add-expense':   return <AddExpense onNavigate={navigateTo} onToast={showToast} />;
      case 'settle':        return <SettleUp onNavigate={navigateTo} onToast={showToast} />;
      case 'wallet-settings': return <WalletSettings onNavigate={navigateTo} onToast={showToast} />;
      case 'create-group':  return <CreateGroup onNavigate={navigateTo} onToast={showToast} />;
      case 'join-group':    return <JoinGroup onNavigate={navigateTo} onToast={showToast} />;
      case 'pro':           return <ProUpgrade onNavigate={navigateTo} onToast={showToast} />;
      default:              return <GroupList onNavigate={navigateTo} onToast={showToast} />;
    }
  };

  const AppContent = (
    <div className="app">
      <main className="page-content">
        {renderPage()}
      </main>
      <BottomNav currentPage={page} onNavigate={navigateTo} />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );

  // If analytics SDK loaded and we have credentials, wrap with provider
  if (twaAnalytics && TELEMETREE_PROJECT_ID && TELEMETREE_API_KEY) {
    const TwaAnalyticsProvider = twaAnalytics;
    return (
      <TwaAnalyticsProvider
        projectId={TELEMETREE_PROJECT_ID}
        apiKey={TELEMETREE_API_KEY}
        telegramWebAppData={telegramData}
      >
        {AppContent}
      </TwaAnalyticsProvider>
    );
  }

  return AppContent;
}
