import React from 'react';

// spec §2.5 Bottom Tab Bar
// bg white, height ~60px, shadow-sm top, active dot below icon, icon 24px
const TABS = [
  { id: 'groups',          icon: '⊞', label: 'Home' },
  { id: 'analytics',       icon: '📊', label: 'Analytics' },
  { id: 'wallet-settings', icon: '👛', label: 'Wallet' },
  { id: 'pro',             icon: '⭐', label: 'Upgrade' },
];

// Pages that count as "active" for each tab
const TAB_PAGES = {
  'groups':          ['groups','group-detail','create-group','join-group','add-expense','settle','trip-summary'],
  'analytics':       ['analytics'],
  'wallet-settings': ['wallet-settings','wallet'],
  'pro':             ['pro'],
};

export default function BottomNav({ currentPage, onNavigate, paymentStatus }) {
  const isPro = paymentStatus?.isPro;

  return (
    <nav className="bottom-nav">
      {TABS.map(tab => {
        if (tab.id === 'pro' && isPro) return null; // hide upgrade tab if already pro

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
