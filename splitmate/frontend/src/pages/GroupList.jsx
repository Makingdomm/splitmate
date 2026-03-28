// =============================================================================
// pages/GroupList.jsx — Main screen: list of user's expense groups
// =============================================================================

import React from 'react';
import useAppStore from '../store/appStore.js';

export default function GroupList({ onNavigate, onToast }) {
  const { groups, user, paymentStatus, setActiveGroup } = useAppStore();

  const handleGroupClick = async (group) => {
    await setActiveGroup(group);
    onNavigate('group-detail');
  };

  const totalNet = groups.reduce((sum, g) => {
    return sum + parseFloat(g.total_lent || 0) - parseFloat(g.total_owed || 0);
  }, 0);

  return (
    <div className="page">
      {/* Header */}
      <div className="header">
        <div>
          <h1 className="header-title">💸 SplitMate</h1>
          <p className="header-subtitle">
            {user ? `Hey, ${user.first_name}!` : 'Your expense groups'}
            {paymentStatus?.isPro && <span className="pro-badge">⭐ Pro</span>}
          </p>
        </div>
      </div>

      {/* Net balance summary */}
      {groups.length > 0 && (
        <div className={`balance-summary ${totalNet >= 0 ? 'positive' : 'negative'}`}>
          <span className="balance-label">Your overall balance</span>
          <span className="balance-amount">
            {totalNet >= 0 ? '+' : ''}{totalNet.toFixed(2)} USD
          </span>
          <span className="balance-hint">
            {totalNet > 0.01
              ? "You're owed money 🎉"
              : totalNet < -0.01
              ? "You owe money"
              : "All settled up ✅"}
          </span>
        </div>
      )}

      {/* Group list */}
      <div className="section">
        {groups.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">👥</span>
            <h3>No groups yet</h3>
            <p>Create a group to start splitting expenses with friends</p>
          </div>
        ) : (
          groups.map(group => {
            const net = parseFloat(group.total_lent || 0) - parseFloat(group.total_owed || 0);
            return (
              <div
                key={group.id}
                className="group-card"
                onClick={() => handleGroupClick(group)}
              >
                <div className="group-card-left">
                  <div className="group-avatar">
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="group-name">{group.name}</div>
                    <div className="group-meta">
                      {group.member_count} members · {group.currency}
                    </div>
                  </div>
                </div>
                <div className={`group-balance ${net >= 0 ? 'owed' : 'owe'}`}>
                  {net === 0
                    ? <span className="settled">✓</span>
                    : <>
                        {net > 0 ? '+' : ''}{net.toFixed(2)}
                        <span className="currency">{group.currency}</span>
                      </>
                  }
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Action buttons */}
      <div className="action-buttons">
        <button
          className="btn btn-primary"
          onClick={() => onNavigate('create-group')}
        >
          + Create Group
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => onNavigate('join-group')}
        >
          Join Group
        </button>
      </div>

      {/* Pro upgrade banner for free users */}
      {!paymentStatus?.isPro && groups.length >= 2 && (
        <div className="upgrade-banner" onClick={() => onNavigate('pro')}>
          <span>⭐ Upgrade to Pro for unlimited groups →</span>
        </div>
      )}
    </div>
  );
}
