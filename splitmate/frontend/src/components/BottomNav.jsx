import React from 'react';

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
    { id:'groups',          icon:'⊞', label:'Home' },
    { id:'analytics',       icon:'📊', label:'Analytics' },
    { id:'wallet-settings', icon:'👛', label:'Wallet' },
    // Always show — "Upgrade" if free, "Plan" if Pro
    { id:'pro', icon: isElite ? '💎' : isPro ? '⭐' : '⭐', label: isElite ? 'Elite' : isPro ? 'Plan' : 'Upgrade' },
  ];

  return (
    <nav className="bottom-nav">
      {TABS.map(tab => {
        const isActive = TAB_PAGES[tab.id]?.includes(currentPage) || currentPage === tab.id;
        return (
          <button
            key={tab.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onNavigate(tab.id)}
          >
            <span className="nav-icon" style={{ color: isActive ? '#4B5320' : '#CCCCCC' }}>
              {tab.icon}
            </span>
            <span className="nav-label" style={{ color: isActive ? '#4B5320' : '#CCCCCC' }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
