// =============================================================================
// App.jsx — Root component with routing and theme setup
// Uses Telegram's native color scheme for seamless UI integration
// TGAnalytics SDK integrated — token from TON Builders → Analytics tab
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
import Analytics from './pages/Analytics.jsx';
import BottomNav from './components/BottomNav.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import Toast from './components/Toast.jsx';

// ── TGAnalytics SDK ────────────────────────────────────────────────────────
// Token from TON Builders → SplitMate → Analytics tab → "See Key"
// appName must match the analytics identifier registered in the moderation bot
const TG_ANALYTICS_TOKEN   = import.meta.env.VITE_TG_ANALYTICS_TOKEN || '';
const TG_ANALYTICS_APP_NAME = import.meta.env.VITE_TG_ANALYTICS_APP_NAME || 'splitmate';

function initTGAnalytics() {
  if (!TG_ANALYTICS_TOKEN) return;
  try {
    import('@telegram-apps/analytics').then(({ default: TelegramAnalytics }) => {
      TelegramAnalytics.init({
        token: TG_ANALYTICS_TOKEN,
        appName: TG_ANALYTICS_APP_NAME,
      });
      console.log('[Analytics] TGAnalytics initialized');
    });
  } catch (e) {
    console.warn('[Analytics] TGAnalytics failed to load:', e.message);
  }
}

export default function App() {
  const { initUser, fetchGroups, fetchPaymentStatus, loading, error, clearError } = useAppStore();
  const [page, setPage] = useState('groups');
  const [pageHistory, setPageHistory] = useState([]);
  const [initialized, setInitialized] = useState(false);

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
      // Init analytics FIRST before anything renders
      initTGAnalytics();

      initUser();

      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();
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
      case 'analytics':     return <Analytics onNavigate={navigateTo} onToast={showToast} />;
      default:              return <GroupList onNavigate={navigateTo} onToast={showToast} />;
    }
  };

  return (
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
}
