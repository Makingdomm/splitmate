import React from 'react';

const NAV_ITEMS = [
  { page: 'groups', icon: '👥', label: 'Groups' },
  { page: 'pro',    icon: '⭐', label: 'Pro' },
];

export default function BottomNav({ currentPage, onNavigate }) {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(item => (
        <button
          key={item.page}
          className={`nav-item ${currentPage === item.page ? 'active' : ''}`}
          onClick={() => onNavigate(item.page)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
