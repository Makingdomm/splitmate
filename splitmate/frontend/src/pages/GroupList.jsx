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
                {tier === 'elite' ? 'Elite' : 'Pro'}
              </span>
            )}
            <button className="btn-icon circle" onClick={() => onNavigate('wallet')} style={{ background: '#F5F5F5', color: '#4B5320', display:'flex', alignItems:'center', justifyContent:'center', width:36, height:36, border:'none', borderRadius:'50%', cursor:'pointer' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M20 12V8C20 6.89543 19.1046 6 18 6H4C2.89543 6 2 6.89543 2 8V16C2 17.1046 2.89543 18 4 18H18C19.1046 18 20 17.1046 20 16V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 12C16 13.6569 17.3431 15 19 15H22V9H19C17.3431 9 16 10.3431 16 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
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
              <div className="empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11Z" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 8V14" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 11H23" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
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
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(184,150,26,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color:'#4B5320' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
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
              { icon: 'wallet', label: 'Wallet & Crypto',  sub: 'Manage your payment methods',  nav: 'wallet-settings' },
              { icon: 'analytics', label: 'Analytics',         sub: 'View spending insights',        nav: 'analytics'       },
              { icon: 'plan', label: isPro ? 'My Plan' : 'Upgrade to Pro', sub: isPro ? 'Manage your subscription' : 'Unlock receipt scanning & more', nav: 'pro' },
              { icon: 'refer', label: 'Refer & Earn',       sub: 'Get free Pro months',              nav: 'refer'           },
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
                  {item.icon==='wallet' ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M20 12V8C20 6.89543 19.1046 6 18 6H4C2.89543 6 2 6.89543 2 8V16C2 17.1046 2.89543 18 4 18H18C19.1046 18 20 17.1046 20 16V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 12C16 13.6569 17.3431 15 19 15H22V9H19C17.3431 9 16 10.3431 16 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> : item.icon==='analytics' ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M18 20V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 20V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 20V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> : item.icon==='plan' ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> : item.icon==='refer' ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> : item.icon}
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