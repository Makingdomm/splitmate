import React, { useState } from 'react';
import { NewGroupIcon, JoinGroupIcon, MoreIcon } from '../components/Icons.jsx';
import useAppStore from '../store/appStore.js';

// Per spec §3.2: Group cards use military green gradients (mini credit card style)
const GROUP_GRADIENTS = [
  { bg: 'linear-gradient(135deg, #4B5320, #6B7B3A)', text: '#fff' },
  { bg: 'linear-gradient(135deg, #3A4219, #4B5320)', text: '#fff' },
  { bg: 'linear-gradient(135deg, #6B7B3A, #8F974B)', text: '#fff' },
  { bg: 'linear-gradient(135deg, #4B5320, #8F974B)', text: '#fff' },
  { bg: 'linear-gradient(135deg, #3A4219, #6B7B3A)', text: '#fff' },
];

const CAT_COLORS = ['#4B5320','#DC3545','#FFC107','#28A745','#6B7B3A'];

export default function GroupList({ onNavigate, onToast }) {
  const { groups, user, paymentStatus, setActiveGroup } = useAppStore();
  const [showMore, setShowMore] = useState(false);

  const handleGroupClick = async (group) => {
    await setActiveGroup(group);
    onNavigate('group-detail');
  };

  const totalNet   = groups.reduce((s, g) => s + parseFloat(g.total_lent || 0) - parseFloat(g.total_owed || 0), 0);
  const totalLent  = groups.reduce((s, g) => s + parseFloat(g.total_lent || 0), 0);
  const totalOwed  = groups.reduce((s, g) => s + parseFloat(g.total_owed || 0), 0);
  const isPositive = totalNet > 0.01;
  const isNegative = totalNet < -0.01;
  const isPro      = paymentStatus?.isPro;
  const tier       = paymentStatus?.tier;

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F5' }}>
      {/* ── Header — spec §2.11 ── */}
      <div style={{ background: '#fff', padding: '16px 24px 12px', borderBottom: '1px solid #F5F5F5' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            {/* Display — 32px bold #333 */}
            <div style={{ fontSize: 24, fontWeight: 700, lineHeight: '32px', color: '#333333', marginBottom: 2 }}>
              Hi, {user?.first_name || user?.username || 'there'} 👋
            </div>
            {/* Body Medium — 14px regular #CCCCCC */}
            <div style={{ fontSize: 14, color: '#CCCCCC', lineHeight: '20px' }}>Welcome Back!</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isPro && (
              <span className={`badge ${tier === 'elite' ? 'badge-elite' : 'badge-pro'}`}>
                {tier === 'elite' ? '💎 Elite' : '⭐ Pro'}
              </span>
            )}
            <button className="btn-icon circle" onClick={() => onNavigate('wallet')} style={{ fontSize: 18, background: '#F5F5F5', color: '#333' }}>💼</button>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 24px 24px' }}>

        {/* ── Group Balances Card — spec §3.2 adapted ── */}
        <div className="card animate-in" style={{ marginTop: 24, marginBottom: 24 }}>
          {/* Heading 2 — 20px semibold */}
          <div style={{ fontSize: 20, fontWeight: 600, color: '#333', lineHeight: '28px', marginBottom: 4 }}>
            Group Balances
          </div>
          {/* Display — 32px bold */}
          <div style={{ fontSize: 32, fontWeight: 700, lineHeight: '40px', color: '#333333', marginBottom: 4 }}>
            {isPositive && <span style={{ color: '#4B5320' }}>+</span>}
            {isNegative && <span style={{ color: '#DC3545' }}>-</span>}
            ${Math.abs(totalNet).toFixed(2)}
          </div>
          <div style={{ fontSize: 14, color: '#CCCCCC', lineHeight: '20px', marginBottom: 20 }}>
            {isPositive ? '↑ You\'re owed overall' : isNegative ? '↓ You owe overall' : '✓ All settled up'}
          </div>

          {/* Mini Group Cards strip — spec §3.2 Cards */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
            {/* Add Group button — spec §2.12 Add Card Button */}
            <button
              onClick={() => onNavigate('create-group')}
              style={{
                width: 64, height: 40, borderRadius: '999px',
                background: '#F5F5F5', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, color: '#CCCCCC', cursor: 'pointer', flexShrink: 0,
              }}
            >+</button>
            {groups.slice(0, 4).map((g, i) => (
              <div
                key={g.id}
                className="mini-card"
                onClick={() => handleGroupClick(g)}
                style={{
                  background: GROUP_GRADIENTS[i % GROUP_GRADIENTS.length].bg,
                  cursor: 'pointer', flexShrink: 0, minWidth: 90,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: 40,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', textAlign: 'center', padding: '0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 80 }}>
                  {g.name}
                </span>
              </div>
            ))}
          </div>

          {/* Quick Actions — spec §3.2 */}
          <div className="quick-actions">
            <button className="qa-btn settle" onClick={() => onNavigate('create-group')}>
              <span className="qa-icon"><NewGroupIcon /></span>
              New Group
            </button>
            <button className="qa-btn request" onClick={() => onNavigate('join-group')}>
              <span className="qa-icon"><JoinGroupIcon /></span>
              Join Group
            </button>
            <button className="qa-btn more" onClick={() => setShowMore(true)}>
              <span className="qa-icon"><MoreIcon /></span>
              More
            </button>
          </div>
        </div>

        {/* ── Recent Splits — spec §3.2 ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="text-h2">Recent Splits</div>
          {groups.length > 0 && (
            <span style={{ fontSize: 14, color: '#CCCCCC', cursor: 'pointer' }}>View All &gt;</span>
          )}
        </div>

        {groups.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <div className="empty-title">No groups yet</div>
              <div className="empty-desc">Create a group and start splitting expenses with friends</div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {groups.map((group, i) => {
              const net      = parseFloat(group.total_lent || 0) - parseFloat(group.total_owed || 0);
              const isOwed   = net > 0.01;
              const isOwing  = net < -0.01;
              const gradient = GROUP_GRADIENTS[i % GROUP_GRADIENTS.length];

              return (
                <div
                  key={group.id}
                  className="list-item card-tappable"
                  onClick={() => handleGroupClick(group)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Avatar — spec §2.7 circular */}
                  <div className="avatar avatar-lg" style={{
                    background: gradient.bg,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 18,
                    borderRadius: '50%',
                  }}>
                    {group.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Body Large — 16px regular #333 */}
                    <div className="list-item-primary" style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {group.name}
                    </div>
                    {/* Body Small — 12px #CCCCCC */}
                    <div className="list-item-secondary">
                      {group.member_count} members · {group.currency}
                    </div>
                  </div>

                  {/* Amount — spec §2.4 */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {Math.abs(net) < 0.01 ? (
                      <span className="badge badge-success" style={{ fontSize: 11 }}>Settled ✓</span>
                    ) : (
                      <>
                        <div className={`list-item-amount ${isOwed ? 'positive' : 'negative'}`} style={{ fontWeight: 600 }}>
                          {net > 0 ? '+' : ''}${Math.abs(net).toFixed(2)}
                        </div>
                        <div className="list-item-secondary">
                          {isOwed ? 'owed to you' : 'you owe'}
                        </div>
                      </>
                    )}
                  </div>

                  <div style={{ color: '#CCCCCC', fontSize: 18, flexShrink: 0, marginLeft: 4 }}>›</div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pro Upsell ── */}
        {!isPro && groups.length >= 1 && (
          <div
            onClick={() => onNavigate('pro')}
            className="card card-tappable animate-in"
            style={{
              marginTop: 16,
              background: 'rgba(184,150,26,0.06)',
              border: '1px solid rgba(184,150,26,0.25)',
              display: 'flex', alignItems: 'center', gap: 16,
              boxShadow: 'none',
            }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(184,150,26,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>⭐</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#b8961a', marginBottom: 2 }}>Upgrade to Pro</div>
              <div className="list-item-secondary">AI receipts · Analytics · Unlimited groups</div>
            </div>
            <div style={{ color: '#CCCCCC', fontSize: 18 }}>›</div>
          </div>
        )}

      </div>
      {/* ── More Bottom Sheet ── */}
      {showMore && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowMore(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100 }}
          />
          {/* Sheet */}
          <div style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 101,
            background: '#fff', borderRadius: '20px 20px 0 0',
            padding: '12px 24px 40px', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
            animation: 'slideUp 0.22s ease',
          }}>
            {/* Handle */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E0E0E0', margin: '0 auto 20px' }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: '#333', marginBottom: 20 }}>More Options</div>

            {[
              { icon: '💼', label: 'Wallet & Crypto',  sub: 'Manage your payment methods',  nav: 'wallet-settings' },
              { icon: '📊', label: 'Analytics',         sub: 'View spending insights',        nav: 'analytics'       },
              { icon: '⭐', label: isPro ? 'My Plan' : 'Upgrade to Pro', sub: isPro ? 'Manage your subscription' : 'Unlock receipt scanning & more', nav: 'pro' },
            ].map(item => (
              <button
                key={item.nav}
                onClick={() => { setShowMore(false); onNavigate(item.nav); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 16,
                  padding: '14px 0', background: 'none', border: 'none',
                  borderBottom: '1px solid #F5F5F5', cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#333', lineHeight: '20px' }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: '#AAAAAA', marginTop: 2 }}>{item.sub}</div>
                </div>
                <div style={{ color: '#CCCCCC', fontSize: 18 }}>›</div>
              </button>
            ))}

            <button
              onClick={() => setShowMore(false)}
              style={{
                width: '100%', marginTop: 16, padding: '14px',
                background: '#F5F5F5', border: 'none', borderRadius: 12,
                fontSize: 15, fontWeight: 600, color: '#333',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >Cancel</button>
          </div>
        </>
      )}

    </div>
  );
}