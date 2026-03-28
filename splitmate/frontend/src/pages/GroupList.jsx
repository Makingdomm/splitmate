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

  const summaryClass = totalNet > 0.01 ? 'positive' : totalNet < -0.01 ? 'negative' : 'neutral';
  const summaryText  = totalNet > 0.01 ? `You're owed $${totalNet.toFixed(2)}` : totalNet < -0.01 ? `You owe $${Math.abs(totalNet).toFixed(2)}` : 'All settled up ✓';
  const summaryEmoji = totalNet > 0.01 ? '📈' : totalNet < -0.01 ? '📉' : '✓';

  return (
    <div className="page">
      {/* Header */}
      <div className="header">
        <div className="header-logo">💸</div>
        <div>
          <h1 className="header-title">SplitMate</h1>
          <p className="header-subtitle">
            {user ? `Hey, ${user.first_name || user.username}!` : 'Your expense groups'}
            {paymentStatus?.isPro && <span className="pro-badge">⭐ Pro</span>}
          </p>
        </div>
      </div>

      {/* Balance hero */}
      {groups.length > 0 && (
        <div className={`balance-hero ${summaryClass}`}>
          <span className="balance-label">Overall balance</span>
          <div className="balance-amount">
            {totalNet === 0 ? '—' : (totalNet > 0 ? '+' : '') + '$' + Math.abs(totalNet).toFixed(2)}
          </div>
          <span className="balance-hint">{summaryEmoji} {summaryText}</span>
        </div>
      )}

      {/* Group list */}
      <div className="section" style={{ marginTop: groups.length === 0 ? 0 : 4 }}>
        {groups.length > 0 && <p className="section-title">Your groups</p>}

        {groups.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">👥</span>
            <h3>No groups yet</h3>
            <p>Create a group to start splitting expenses with friends or travel mates</p>
          </div>
        ) : (
          groups.map(group => {
            const net = parseFloat(group.total_lent || 0) - parseFloat(group.total_owed || 0);
            return (
              <div key={group.id} className="group-card" onClick={() => handleGroupClick(group)}>
                <div className="group-card-left">
                  <div className="group-avatar">{group.name.charAt(0).toUpperCase()}</div>
                  <div>
                    <div className="group-name">{group.name}</div>
                    <div className="group-meta">{group.member_count} members · {group.currency}</div>
                  </div>
                </div>
                <div className={`group-balance ${net > 0.01 ? 'owed' : net < -0.01 ? 'owe' : ''}`}>
                  {Math.abs(net) < 0.01
                    ? <span className="settled">✓</span>
                    : <>{net > 0 ? '+' : ''}{net.toFixed(2)}<span className="currency"> {group.currency}</span></>
                  }
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Action buttons */}
      <div className="action-buttons">
        <button className="btn btn-primary" onClick={() => onNavigate('create-group')}>
          + New Group
        </button>
        <button className="btn btn-secondary" onClick={() => onNavigate('join-group')}>
          Join with Code
        </button>
      </div>

      {/* Pro upsell */}
      {!paymentStatus?.isPro && groups.length >= 2 && (
        <div className="upgrade-banner" onClick={() => onNavigate('pro')}>
          <span>⭐</span>
          <span>Upgrade to Pro for unlimited groups →</span>
        </div>
      )}
    </div>
  );
}
