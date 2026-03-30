import React from 'react';

// spec §2.5 Bottom Tab Bar
// bg white, height ~60px, shadow-sm top, active dot below icon, icon 24px
const TABS = [
  { id: 'groups',    icon: '⊞', label: 'Home' },
  { id: 'analytics', icon: '📊', label: 'Analytics' },
  { id: 'wallet',    icon: '👛', label: 'Wallet' },
  { id: 'pro',       icon: '⭐', label: 'Upgrade' },
];

export default function BottomNav({ current, onNavigate, paymentStatus }) {
  const isPro  = paymentStatus?.isPro;
  const tier   = paymentStatus?.tier;

  return (
    <nav className="bottom-nav">
      {TABS.map(tab => {
        const isActive = current === tab.id ||
          (tab.id === 'groups' && ['group-detail','create-group','join-group','add-expense','settle','trip-summary'].includes(current));
        const isProTab = tab.id === 'pro';

        // Hide upgrade tab if already pro
        if (isProTab && isPro) return null;

        return (
          <button
            key={tab.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onNavigate(tab.id)}
          >
            {/* Icon — spec: 24x24, inactive: #CCCCCC, active: #4B5320 */}
            <span
              className="nav-icon"
              style={{ fontSize: 22, color: isActive ? '#4B5320' : '#CCCCCC' }}
            >
              {tab.icon}
            </span>
            {/* Label */}
            <span
              className="nav-label"
              style={{ color: isActive ? '#4B5320' : '#CCCCCC' }}
            >
              {isProTab && !isPro ? 'Upgrade' : tab.label}
            </span>
          </button>
        );
      })}

      {/* Show wallet-settings as sub-tab if on wallet screens */}
      {['wallet', 'wallet-settings'].includes(current) && (
        <button
          className={`nav-item ${current === 'wallet-settings' ? 'active' : ''}`}
          onClick={() => onNavigate('wallet-settings')}
        >
          <span className="nav-icon" style={{ fontSize: 22, color: current === 'wallet-settings' ? '#4B5320' : '#CCCCCC' }}>💼</span>
          <span className="nav-label" style={{ color: current === 'wallet-settings' ? '#4B5320' : '#CCCCCC' }}>Settings</span>
        </button>
      )}
    </nav>
  );
}
