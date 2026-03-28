// =============================================================================
// App.jsx — Root component with routing and theme setup
// Uses Telegram's native color scheme for seamless UI integration
// =============================================================================

import React, { useEffect, useState } from 'react';
import useAppStore from './store/appStore.js';
import GroupList from './pages/GroupList.jsx';
import GroupDetail from './pages/GroupDetail.jsx';
import AddExpense from './pages/AddExpense.jsx';
import SettleUp from './pages/SettleUp.jsx';
import ProUpgrade from './pages/ProUpgrade.jsx';
import CreateGroup from './pages/CreateGroup.jsx';
import JoinGroup from './pages/JoinGroup.jsx';
import BottomNav from './components/BottomNav.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import Toast from './components/Toast.jsx';

export default function App() {
  const { initUser, fetchGroups, fetchPaymentStatus, loading, error, clearError } = useAppStore();
  const [page, setPage] = useState('groups');    // Current page
  const [initialized, setInitialized] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Bootstrap the app ──────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      initUser();
      await Promise.all([fetchGroups(), fetchPaymentStatus()]);
      setInitialized(true);
    };
    init();

    // Apply Telegram's theme colors as CSS variables
    const tg = window.Telegram?.WebApp;
    if (tg) {
      const root = document.documentElement;
      root.style.setProperty('--tg-bg',          tg.backgroundColor || '#ffffff');
      root.style.setProperty('--tg-secondary-bg', tg.secondaryBackgroundColor || '#f4f4f5');
      root.style.setProperty('--tg-text',         tg.themeParams?.text_color || '#000000');
      root.style.setProperty('--tg-hint',         tg.themeParams?.hint_color || '#999999');
      root.style.setProperty('--tg-link',         tg.themeParams?.link_color || '#2481cc');
      root.style.setProperty('--tg-button',       tg.themeParams?.button_color || '#2481cc');
      root.style.setProperty('--tg-button-text',  tg.themeParams?.button_text_color || '#ffffff');
    }
  }, []);

  // Show toast when errors occur
  useEffect(() => {
    if (error) {
      setToast({ type: 'error', message: error });
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
      case 'groups':
        return <GroupList onNavigate={setPage} onToast={showToast} />;
      case 'group-detail':
        return <GroupDetail onNavigate={setPage} onToast={showToast} />;
      case 'add-expense':
        return <AddExpense onNavigate={setPage} onToast={showToast} />;
      case 'settle':
        return <SettleUp onNavigate={setPage} onToast={showToast} />;
      case 'create-group':
        return <CreateGroup onNavigate={setPage} onToast={showToast} />;
      case 'join-group':
        return <JoinGroup onNavigate={setPage} onToast={showToast} />;
      case 'pro':
        return <ProUpgrade onNavigate={setPage} onToast={showToast} />;
      default:
        return <GroupList onNavigate={setPage} onToast={showToast} />;
    }
  };

  return (
    <div className="app">
      <main className="page-content">
        {renderPage()}
      </main>
      <BottomNav currentPage={page} onNavigate={setPage} />
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
