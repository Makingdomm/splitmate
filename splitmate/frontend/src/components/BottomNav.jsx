import React from 'react';
import {
  HomeActive, HomeInactive,
  AnalyticsActive, AnalyticsInactive,
  WalletActive, WalletInactive,
  UpgradeActive, UpgradeInactive,
} from './Icons.jsx';

const TAB_PAGES = {
  'groups':          ['groups','group-detail','create-group','join-group','add-expense','settle','trip-summary'],
  'analytics':       ['analytics'],
  'wallet-settings': ['wallet-settings','wallet'],
  'pro':             ['pro'],
};

export default function BottomNav({ currentPage, onNavigate, paymentStatus }) {
  const isPro   = paymentStatus?.isPro;
  const isElite = paymentStatus?.tier === 'elite';

  const TABS = [
    {
      id: 'groups',
      ActiveIcon: HomeActive,
      InactiveIcon: HomeInactive,
      label: 'Home',
    },
    {
      id: 'analytics',
      ActiveIcon: AnalyticsActive,
      InactiveIcon: AnalyticsInactive,
      label: 'Analytics',
    },
    {
      id: 'wallet-settings',
      ActiveIcon: WalletActive,
      InactiveIcon: WalletInactive,
      label: 'Wallet',
    },
    {
      id: 'pro',
      ActiveIcon: UpgradeActive,
      InactiveIcon: UpgradeInactive,
      label: isElite ? 'Elite' : isPro ? 'Plan' : 'Upgrade',
    },
  ];

  return (
    <nav className="bottom-nav">
      {TABS.map(({ id, ActiveIcon, InactiveIcon, label }) => {
        const isActive = TAB_PAGES[id]?.includes(currentPage) || currentPage === id;
        const Ico = isActive ? ActiveIcon : InactiveIcon;
        return (
          <button
            key={id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onNavigate(id)}
          >
            <Ico />
            <span className="nav-label" style={{ color: isActive ? '#4B5320' : '#999999' }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
