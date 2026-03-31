import React, { useEffect, useState, useCallback } from 'react';
import useAppStore from './store/appStore.js';
import GroupList      from './pages/GroupList.jsx';
import GroupDetail    from './pages/GroupDetail.jsx';
import AddExpense     from './pages/AddExpense.jsx';
import SettleUp       from './pages/SettleUp.jsx';
import WalletSettings from './pages/WalletSettings.jsx';
import ProUpgrade     from './pages/ProUpgrade.jsx';
import CreateGroup    from './pages/CreateGroup.jsx';
import JoinGroup      from './pages/JoinGroup.jsx';
import Analytics      from './pages/Analytics.jsx';
import ReferEarn      from './pages/ReferEarn.jsx';
import BottomNav      from './components/BottomNav.jsx';
import LoadingScreen  from './components/LoadingScreen.jsx';
import Toast          from './components/Toast.jsx';

export default function App() {
  const { initUser, fetchGroups, fetchPaymentStatus, paymentStatus, loading, error, clearError } = useAppStore();
  const [page, setPage]             = useState('groups');
  const [pageHistory, setPageHistory] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [toast, setToast]           = useState(null);

  const navigateTo = useCallback((target) => {
    if (target === -1) {
      setPageHistory(prev => {
        const next = [...prev];
        const prevPage = next.pop() || 'groups';
        setPage(prevPage);
        return next;
      });
    } else {
      setPageHistory(prev => [...prev, page]);
      setPage(target);
    }
  }, [page]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  }, []);

  // Bootstrap
  useEffect(() => {
    const init = async () => {
      initUser();
      const tg = window.Telegram?.WebApp;
      if (tg) { tg.ready(); tg.expand(); tg.enableClosingConfirmation(); }
      try { await Promise.all([fetchGroups(), fetchPaymentStatus()]); }
      catch (err) { console.warn('Init failed:', err.message); }
      setInitialized(true);
    };
    init();
  }, []);

  // Toast on store errors
  useEffect(() => {
    if (error) {
      const isAuth = /unauthorized|missing auth|pattern/i.test(error);
      if (!isAuth) showToast(error, 'error');
      clearError();
    }
  }, [error]);

  // Telegram Back Button
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    pageHistory.length > 0 ? tg.BackButton.show() : tg.BackButton.hide();
    const handleBack = () => navigateTo(-1);
    tg.BackButton.onClick(handleBack);
    return () => tg.BackButton.offClick(handleBack);
  }, [pageHistory, navigateTo]);

  if (!initialized) return <LoadingScreen />;

  const renderPage = () => {
    const props = { onNavigate: navigateTo, onToast: showToast };
    switch (page) {
      case 'groups':          return <GroupList      {...props} />;
      case 'group-detail':    return <GroupDetail    {...props} />;
      case 'add-expense':     return <AddExpense     {...props} />;
      case 'settle':          return <SettleUp       {...props} />;
      // both 'wallet' and 'wallet-settings' go to the same page
      case 'wallet':
      case 'wallet-settings': return <WalletSettings {...props} />;
      case 'create-group':    return <CreateGroup    {...props} />;
      case 'join-group':      return <JoinGroup      {...props} />;
      case 'pro':             return <ProUpgrade     {...props} />;
      case 'analytics':       return <Analytics      {...props} />;
      case 'refer':            return <ReferEarn      {...props} />;
      default:                return <GroupList      {...props} />;
    }
  };

  return (
    <div className="app">
      <main className="page-content">
        {renderPage()}
      </main>
      {/* Pass currentPage (not current) — BottomNav reads currentPage prop */}
      <BottomNav
        currentPage={page}
        onNavigate={navigateTo}
        paymentStatus={paymentStatus}
      />
      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
