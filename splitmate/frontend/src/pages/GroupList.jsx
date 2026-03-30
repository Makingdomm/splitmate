import React from 'react';
import useAppStore from '../store/appStore.js';

const GROUP_COLORS = [
  { bg: '#f0f4ec', border: '#d4e0c8', text: '#4a5e38', dot: '#4a5e38' },
  { bg: '#fdf4e8', border: '#f0d9b0', text: '#b8761a', dot: '#d4851a' },
  { bg: '#eef1fb', border: '#d0d8f4', text: '#4a5ea8', dot: '#5a6ec8' },
  { bg: '#fdeef0', border: '#f4d0d4', text: '#a83a44', dot: '#c04050' },
  { bg: '#edf8f4', border: '#c8ecde', text: '#2a7a5a', dot: '#38986e' },
];

export default function GroupList({ onNavigate, onToast }) {
  const { groups, user, paymentStatus, setActiveGroup } = useAppStore();

  const handleGroupClick = async (group) => {
    await setActiveGroup(group);
    onNavigate('group-detail');
  };

  const totalNet = groups.reduce((s, g) =>
    s + parseFloat(g.total_lent || 0) - parseFloat(g.total_owed || 0), 0);
  const isPositive = totalNet > 0.01;
  const isNegative = totalNet < -0.01;
  const isPro = paymentStatus?.isPro;
  const tier = paymentStatus?.tier;

  const totalLent = groups.reduce((s, g) => s + parseFloat(g.total_lent || 0), 0);
  const totalOwed = groups.reduce((s, g) => s + parseFloat(g.total_owed || 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      <div style={{ padding: '0 16px 24px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 18, paddingBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', letterSpacing: -0.5, marginBottom: 2 }}>
              Hi, {user?.first_name || user?.username || 'there'} 👋
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>Welcome back!</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {isPro && (
              <span className={`badge ${tier === 'elite' ? 'badge-elite' : 'badge-pro'}`}>
                {tier === 'elite' ? '💎 Elite' : '⭐ Pro'}
              </span>
            )}
            <button className="btn-icon accent" onClick={() => onNavigate('wallet')} title="Wallet">💼</button>
          </div>
        </div>

        {/* ── Balance Hero (Brand Card) ── */}
        <div className="brand-card animate-in" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Total Balance
          </div>
          <div style={{ fontSize: 42, fontWeight: 900, color: '#fff', letterSpacing: -2, lineHeight: 1, marginBottom: 10 }}>
            {totalNet === 0 ? '$0.00' : `${isPositive ? '+' : '-'}$${Math.abs(totalNet).toFixed(2)}`}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginBottom: 20 }}>
            {isPositive ? '📈 You\'re owed money' : isNegative ? '📉 You owe money' : '✓ All settled up'}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 0, background: 'rgba(255,255,255,0.12)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ flex: 1, padding: '12px 14px', borderRight: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', marginBottom: 2 }}>${totalLent.toFixed(0)}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Lent</div>
            </div>
            <div style={{ flex: 1, padding: '12px 14px', borderRight: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', marginBottom: 2 }}>${totalOwed.toFixed(0)}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Owed</div>
            </div>
            <div style={{ flex: 1, padding: '12px 14px' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', marginBottom: 2 }}>{groups.length}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Groups</div>
            </div>
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <button
            onClick={() => onNavigate('create-group')}
            style={{
              flex: 1, height: 52, borderRadius: 100,
              background: 'var(--brand-grad)', border: 'none',
              color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: 'var(--shadow-brand)', fontFamily: 'var(--font)',
              transition: 'transform 0.12s',
            }}
          >
            <span style={{ fontSize: 18 }}>＋</span> New Group
          </button>
          <button
            onClick={() => onNavigate('join-group')}
            className="btn-ghost"
            style={{ flex: 1, height: 52, fontSize: 13 }}
          >
            🔗 Join Group
          </button>
        </div>

        {/* ── Groups List ── */}
        {groups.length > 0 && (
          <div className="section-label" style={{ paddingLeft: 2 }}>Your Groups</div>
        )}

        {groups.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <div className="empty-title">No groups yet</div>
              <div className="empty-desc">Create a group and start splitting expenses with friends instantly</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {groups.map((group, i) => {
              const net = parseFloat(group.total_lent || 0) - parseFloat(group.total_owed || 0);
              const isOwed = net > 0.01;
              const isOwing = net < -0.01;
              const colors = GROUP_COLORS[i % GROUP_COLORS.length];

              return (
                <div
                  key={group.id}
                  className="card card-hover"
                  onClick={() => handleGroupClick(group)}
                  style={{ padding: '16px 16px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 50, height: 50, borderRadius: 16, flexShrink: 0,
                      background: colors.bg,
                      border: `1.5px solid ${colors.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, fontWeight: 900, color: colors.text,
                    }}>
                      {group.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {group.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.dot, display: 'inline-block', flexShrink: 0 }} />
                        {group.member_count} member{group.member_count !== 1 ? 's' : ''} · {group.currency}
                      </div>
                    </div>

                    {/* Balance */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {Math.abs(net) < 0.01 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span className="badge badge-green">Settled ✓</span>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: 16, fontWeight: 900, color: isOwed ? 'var(--brand)' : 'var(--red)', letterSpacing: -0.3 }}>
                            {net > 0 ? '+' : ''}${Math.abs(net).toFixed(2)}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginTop: 1 }}>
                            {isOwed ? 'owed to you' : 'you owe'}
                          </div>
                        </>
                      )}
                    </div>

                    <div style={{ color: 'var(--text-4)', fontSize: 20, fontWeight: 300, flexShrink: 0 }}>›</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pro Upsell ── */}
        {!isPro && groups.length >= 1 && (
          <div
            onClick={() => onNavigate('pro')}
            className="card card-hover animate-in"
            style={{
              marginTop: 16, padding: '16px 18px',
              background: 'linear-gradient(135deg, rgba(184,150,26,0.08), rgba(184,150,26,0.04))',
              border: '1.5px solid rgba(184,150,26,0.2)',
              display: 'flex', alignItems: 'center', gap: 14,
              boxShadow: 'none',
            }}
          >
            <div style={{ width: 46, height: 46, borderRadius: 15, background: 'rgba(184,150,26,0.12)', border: '1.5px solid rgba(184,150,26,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>⭐</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gold)', marginBottom: 3 }}>Upgrade to Pro</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>AI receipts · Analytics · More groups</div>
            </div>
            <div style={{ color: 'var(--text-4)', fontSize: 20 }}>›</div>
          </div>
        )}

      </div>
    </div>
  );
}
