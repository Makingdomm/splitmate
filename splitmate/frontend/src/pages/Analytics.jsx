// =============================================================================
// Analytics.jsx — Spending analytics for a group (Pro only)
// =============================================================================
import React, { useState, useEffect } from 'react';
import useAppStore from '../store/appStore.js';
import api from '../utils/api.js';

const CAT_ICONS = {
  food: '🍕', transport: '🚗', accommodation: '🏨',
  entertainment: '🎬', shopping: '🛍️', health: '💊',
  utilities: '💡', other: '💰', general: '💰',
};

const CAT_COLORS = {
  food: '#f97316', transport: '#3b82f6', accommodation: '#8b5cf6',
  entertainment: '#ec4899', shopping: '#f59e0b', health: '#10b981',
  utilities: '#06b6d4', other: '#6b7280', general: '#6b7280',
};

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtMonth(ym) {
  const [y, m] = ym.split('-');
  return `${MONTH_ABBR[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

export default function Analytics({ onNavigate, onToast }) {
  const { activeGroup, paymentStatus } = useAppStore();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('overview'); // overview | members | timeline

  useEffect(() => {
    if (!activeGroup) return;
    if (!paymentStatus?.isPro) { setLoading(false); return; }
    api.expenses.analytics(activeGroup.id)
      .then(d => setData(d))
      .catch(err => onToast(err.message || 'Failed to load analytics', 'error'))
      .finally(() => setLoading(false));
  }, [activeGroup]);

  if (!activeGroup) { onNavigate('groups'); return null; }

  // ── Pro gate ───────────────────────────────────────────────────────────────
  if (!paymentStatus?.isPro) {
    return (
      <div style={pageStyle}>
        <Header onBack={() => onNavigate('group-detail')} title="Analytics" />
        <div style={{ textAlign: 'center', padding: '60px 32px' }}>
          <div style={{ fontSize: 64, marginBottom: 16, filter: 'drop-shadow(0 0 20px rgba(245,176,30,0.7))' }}>📊</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#f5c842', marginBottom: 10 }}>Pro Feature</div>
          <div style={{ fontSize: 14, color: '#7a8ab8', lineHeight: 1.8, marginBottom: 28 }}>
            Spending analytics, category breakdowns,<br/>member summaries & spending trends.
          </div>
          <button
            onClick={() => onNavigate('pro')}
            style={{ width: '100%', height: 54, background: 'linear-gradient(135deg,#c4830a,#f5b820,#ffd060)', border: 'none', borderRadius: 18, fontSize: 16, fontWeight: 900, color: '#1a0a00', cursor: 'pointer', boxShadow: '0 4px 24px rgba(245,176,30,0.4)' }}
          >
            ⭐ Upgrade — 99 Stars/month
          </button>
          <div style={{ fontSize: 11, color: '#404870', marginTop: 10 }}>Cheaper than Splitwise · Cancel anytime</div>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ ...pageStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, animation: 'spin 1.5s linear infinite' }}>📊</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <div style={{ fontSize: 14, color: '#5060a0', marginTop: 16 }}>Loading analytics…</div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxTimeline = Math.max(...(data.timeline.map(t => t.total)), 1);
  const maxMember   = Math.max(...(data.members.map(m => m.paid)), 1);

  return (
    <div style={pageStyle}>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .ana-card { animation: fadeIn 0.3s ease forwards; }
        .tab-btn:active { transform: scale(0.96); }
        .top-row:active { background: rgba(255,255,255,0.06) !important; }
      `}</style>

      {/* Ambient glow */}
      <div style={{ position:'absolute', top:-40, left:'50%', transform:'translateX(-50%)', width:320, height:320, background:'radial-gradient(circle, rgba(59,110,246,0.15) 0%, transparent 65%)', borderRadius:'50%', pointerEvents:'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Header onBack={() => onNavigate('group-detail')} title="Analytics" subtitle={activeGroup.name} />

        {/* ── Stat cards ─────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '0 16px', marginBottom: 20 }}>
          <StatCard label="Total Spent" value={`$${data.totalUsd.toFixed(0)}`} icon="💸" color="#4fa3ff" />
          <StatCard label="Expenses" value={data.expenseCount} icon="🧾" color="#a78bfa" />
          <StatCard label="Settled" value={`${data.settlementRate}%`} icon="✅" color="#34d399" />
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 6, padding: '0 16px', marginBottom: 16 }}>
          {[['overview','📊 Overview'], ['members','👥 Members'], ['timeline','📈 Timeline']].map(([key, label]) => (
            <button
              key={key}
              className="tab-btn"
              onClick={() => setTab(key)}
              style={{
                flex: 1, height: 36, borderRadius: 12, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                background: tab === key ? 'rgba(79,142,247,0.2)' : 'rgba(255,255,255,0.04)',
                color: tab === key ? '#7ab4ff' : '#5060a0',
                border: tab === key ? '1px solid rgba(79,142,247,0.4)' : '1px solid rgba(255,255,255,0.06)',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Overview tab ────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div style={{ padding: '0 16px' }} className="ana-card">
            {/* Category breakdown */}
            <SectionTitle>Spending by Category</SectionTitle>
            {data.categories.length === 0
              ? <Empty text="No expenses yet" />
              : data.categories.map((cat, i) => (
                <div key={cat.name} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: '#c8d0f0' }}>
                      {CAT_ICONS[cat.name] || '💰'} {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#e0eaff' }}>
                      ${cat.total.toFixed(2)} <span style={{ fontSize: 11, color: '#5060a0' }}>({cat.pct}%)</span>
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      width: `${cat.pct}%`,
                      background: CAT_COLORS[cat.name] || '#6b7280',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
              ))
            }

            {/* Top 5 expenses */}
            {data.top5.length > 0 && (
              <>
                <SectionTitle style={{ marginTop: 24 }}>Biggest Expenses</SectionTitle>
                {data.top5.map((e, i) => (
                  <div key={i} className="top-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, marginBottom: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'default', transition: 'background 0.1s' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: `${CAT_COLORS[e.category] || '#6b7280'}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                      {CAT_ICONS[e.category] || '💰'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e0eaff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.description}</div>
                      <div style={{ fontSize: 11, color: '#404870' }}>{e.paidBy} · {e.date}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#f5c842', flexShrink: 0 }}>
                      {e.currency} {e.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Members tab ─────────────────────────────────────────────────── */}
        {tab === 'members' && (
          <div style={{ padding: '0 16px' }} className="ana-card">
            <SectionTitle>Who Paid the Most</SectionTitle>
            {data.members.length === 0
              ? <Empty text="No member data yet" />
              : data.members.map((m, i) => (
                <div key={m.id} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: `hsl(${i * 70 + 200}, 60%, 30%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                        {m.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span style={{ fontSize: 14, color: '#c8d0f0', fontWeight: 600 }}>{m.name}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#4fa3ff' }}>${m.paid.toFixed(2)} paid</div>
                      <div style={{ fontSize: 11, color: '#404870' }}>${m.owed.toFixed(2)} owed</div>
                    </div>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, width: `${(m.paid / maxMember * 100).toFixed(1)}%`, background: `hsl(${i * 70 + 200}, 70%, 50%)`, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              ))
            }

            {/* Net balances */}
            <SectionTitle style={{ marginTop: 24 }}>Net Balance</SectionTitle>
            {data.members.map((m, i) => {
              const net = m.paid - m.owed;
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 12, marginBottom: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 14, color: '#c8d0f0' }}>{m.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: net >= 0 ? '#34d399' : '#f87171' }}>
                    {net >= 0 ? '+' : ''}{net.toFixed(2)} USD
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Timeline tab ────────────────────────────────────────────────── */}
        {tab === 'timeline' && (
          <div style={{ padding: '0 16px' }} className="ana-card">
            <SectionTitle>Monthly Spending</SectionTitle>
            {data.timeline.length === 0
              ? <Empty text="Not enough data yet" />
              : (
                <>
                  {/* Bar chart */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, marginBottom: 16, padding: '0 4px' }}>
                    {data.timeline.map((t, i) => {
                      const h = Math.max((t.total / maxTimeline) * 100, 4);
                      return (
                        <div key={t.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <div style={{ fontSize: 9, color: '#4fa3ff', fontWeight: 700, opacity: h > 30 ? 1 : 0 }}>${t.total >= 1000 ? (t.total/1000).toFixed(1)+'k' : t.total.toFixed(0)}</div>
                          <div style={{ width: '100%', height: `${h}%`, borderRadius: '4px 4px 0 0', background: i === data.timeline.length - 1 ? 'linear-gradient(180deg, #4fa3ff, #2563eb)' : 'rgba(79,163,255,0.3)', transition: 'height 0.5s ease', minHeight: 4 }} />
                          <div style={{ fontSize: 9, color: '#404870', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtMonth(t.month)}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Monthly list */}
                  {[...data.timeline].reverse().map((t, i) => (
                    <div key={t.month} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 12, marginBottom: 6, background: i === 0 ? 'rgba(79,163,255,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${i === 0 ? 'rgba(79,163,255,0.25)' : 'rgba(255,255,255,0.06)'}` }}>
                      <span style={{ fontSize: 13, color: i === 0 ? '#7ab4ff' : '#c8d0f0', fontWeight: i === 0 ? 700 : 500 }}>{fmtMonth(t.month)}{i === 0 ? ' ← current' : ''}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: i === 0 ? '#4fa3ff' : '#e0eaff' }}>${t.total.toFixed(2)}</span>
                    </div>
                  ))}
                </>
              )
            }

            {/* Export CSV button */}
            <div style={{ marginTop: 24 }}>
              <button
                onClick={() => window.open(`${import.meta.env.VITE_API_URL}/api/expenses/${activeGroup.id}/export`, '_blank')}
                style={{ width: '100%', height: 48, borderRadius: 14, border: '1px solid rgba(79,163,255,0.3)', background: 'rgba(79,163,255,0.08)', fontSize: 14, fontWeight: 700, color: '#4fa3ff', cursor: 'pointer' }}
              >
                📥 Export CSV
              </button>
            </div>
          </div>
        )}

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const pageStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #060818 0%, #0a0f2e 40%, #060818 100%)',
  position: 'relative', overflow: 'hidden',
};

function Header({ onBack, title, subtitle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 12px', position: 'relative', zIndex: 1 }}>
      <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: '#a0b0e0', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>‹</button>
      <div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: '#4a5080' }}>{subtitle}</div>}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '14px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#404870', fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function SectionTitle({ children, style }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#3d4870', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, ...style }}>{children}</div>
  );
}

function Empty({ text }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 0', color: '#404870', fontSize: 14 }}>{text}</div>
  );
}
