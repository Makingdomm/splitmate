// Analytics.jsx — global account view + per-group view
import React, { useState, useEffect } from 'react';
import { CatIcons, BarChartIcon, SparkleIcon, GroupsIcon } from '../components/Icons.jsx';
import useAppStore from '../store/appStore.js';
import api from '../utils/api.js';

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CAT_COLORS = { food:'#4B5320', transport:'#6B7B3A', accommodation:'#8F974B', entertainment:'#DC3545', shopping:'#FFC107', health:'#28A745', utilities:'#3A4219', other:'#CCCCCC', general:'#CCCCCC' };

function fmtMonth(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return `${MONTH_ABBR[parseInt(m,10)-1]} ${y.slice(2)}`;
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ flex:1, background:'#fff', borderRadius:16, padding:'16px 14px', display:'flex', flexDirection:'column', gap:4, boxShadow:'0 1px 4px rgba(0,0,0,0.07)' }}>
      <div style={{ fontSize:11, color:'#888', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color: color || '#333' }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:'#aaa' }}>{sub}</div>}
    </div>
  );
}

function MiniBarChart({ data, maxVal }) {
  if (!data || data.length === 0) return null;
  const max = maxVal || Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:48 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
          <div style={{ width:'100%', height: Math.max(4, Math.round((d.value / max) * 42)), background: d.active ? '#4B5320' : '#6B7B3A', borderRadius:'2px 2px 0 0', transition:'height 0.4s ease' }} />
          <div style={{ fontSize:9, color:'#aaa', lineHeight:1 }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function LineChart({ points, width=320, height=100 }) {
  if (!points || points.length < 2) return null;
  const max = Math.max(...points.map(p=>p.value), 1);
  const min = Math.min(...points.map(p=>p.value), 0);
  const range = max - min || 1;
  const pad = 16;
  const w = width - pad*2;
  const h = height - pad*2;
  const toX = (i) => pad + (i / (points.length-1)) * w;
  const toY = (v) => pad + h - ((v - min) / range) * h;
  const pathD = points.map((p,i) => `${i===0?'M':'L'} ${toX(i).toFixed(1)} ${toY(p.value).toFixed(1)}`).join(' ');
  const fillD = `${pathD} L ${toX(points.length-1).toFixed(1)} ${(pad+h).toFixed(1)} L ${toX(0).toFixed(1)} ${(pad+h).toFixed(1)} Z`;
  const maxIdx = points.indexOf(points.reduce((a,b) => b.value > a.value ? b : a));
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow:'visible' }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6B7B3A" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="#6B7B3A" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={fillD} fill="url(#lineGrad)" />
      <path d={pathD} fill="none" stroke="#4B5320" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {(() => {
        const x = toX(maxIdx); const y = toY(points[maxIdx].value);
        return (
          <g>
            <circle cx={x} cy={y} r="4" fill="#4B5320"/>
            <rect x={x-24} y={y-26} width={48} height={18} rx="4" fill="#fff" filter="drop-shadow(0 1px 3px rgba(0,0,0,0.1))"/>
            <text x={x} y={y-13} textAnchor="middle" fontSize="10" fontWeight="700" fill="#4B5320">${points[maxIdx].value.toFixed(0)}</text>
          </g>
        );
      })()}
      {points.filter((_,i) => i % Math.ceil(points.length/5) === 0).map((p,i) => {
        const origIdx = points.indexOf(p);
        return <text key={i} x={toX(origIdx)} y={height-2} textAnchor="middle" fontSize="10" fill="#aaa">{p.label}</text>;
      })}
    </svg>
  );
}

// ── Global Account Dashboard (no group selected) ─────────────────────────────
function GlobalDashboard({ onNavigate, onToast, paymentStatus, hideHeader }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingGroupId, setDeletingGroupId] = useState(null);

  const handleDeleteGroup = async (groupId) => {
    if (deletingGroupId) return;
    setDeletingGroupId(groupId);
    try {
      // Try admin delete first; if forbidden, fall back to leaving the group
      try {
        await api.groups.delete(groupId);
      } catch (e) {
        if (e.message?.includes('403') || e.message?.toLowerCase().includes('forbidden') || e.message?.toLowerCase().includes('admin')) {
          await api.groups.leave(groupId);
        } else {
          throw e;
        }
      }
      setData(prev => ({
        ...prev,
        groups: prev.groups.filter(g => g.id !== groupId),
        groupCount: (prev.groupCount || 1) - 1,
      }));
      onToast('Group removed');
    } catch (err) {
      onToast(err.message || 'Remove failed', 'error');
    } finally {
      setDeletingGroupId(null);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (deletingId) return;
    setDeletingId(expenseId);
    try {
      await api.expenses.delete(expenseId);
      setData(prev => ({
        ...prev,
        recentExpenses: prev.recentExpenses.filter(e => e.id !== expenseId),
        expenseCount: prev.expenseCount - 1,
      }));
      onToast('Expense deleted');
    } catch (err) {
      onToast(err.message || 'Delete failed', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    api.expenses.myAnalytics()
      .then(d => setData(d))
      .catch(err => onToast(err.message || 'Failed to load analytics', 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'#F5F5F5', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:24, height:24, border:'3px solid #e0e0e0', borderTopColor:'#4B5320', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  const isPro = paymentStatus?.isPro;
  const noData = !data || data.expenseCount === 0;

  const timelinePoints = (data?.timeline || []).map(t => ({ value: t.total, label: fmtMonth(t.month) }));

  return (
    <div style={{ minHeight:'100vh', background:'#F5F5F5', paddingBottom:32 }}>
      {!hideHeader && (
        <div className="page-header">
          <div className="page-header-title">Analytics</div>
        </div>
      )}

      <div style={{ padding:'16px 16px 0' }}>
        {/* Account overview label */}
        <div style={{ fontSize:13, fontWeight:600, color:'#888', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.5px' }}>Your Account</div>

        {noData ? (
          <div style={{ background:'#fff', borderRadius:16, padding:'40px 24px', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.07)' }}>
            <div style={{ width:56, height:56, borderRadius:16, background:'#f0f3ea', display:'flex', alignItems:'center', justifyContent:'center', color:'#4B5320', marginBottom:12 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            </div>
            <div style={{ fontSize:18, fontWeight:700, color:'#333', marginBottom:8 }}>No expenses yet</div>
            <div style={{ fontSize:14, color:'#aaa', marginBottom:20 }}>Add expenses to a group to see your analytics here.</div>
            <button className="btn-primary" onClick={() => onNavigate('groups')}>Go to Groups</button>
          </div>
        ) : (
          <>
            {/* Top stats row */}
            <div style={{ display:'flex', gap:10, marginBottom:12 }}>
              <StatCard label="Total Spent" value={`$${data.totalUsd.toFixed(0)}`} sub={`${data.expenseCount} expenses`} />
              <StatCard label="Groups" value={data.groupCount} sub="active" />
            </div>
            <div style={{ display:'flex', gap:10, marginBottom:16 }}>
              <StatCard label="You Owe" value={`$${data.youOweUsd.toFixed(0)}`} color={data.youOweUsd > 0 ? '#DC3545' : '#28A745'} />
              <StatCard label="Owed to You" value={`$${data.owedToYouUsd.toFixed(0)}`} color={data.owedToYouUsd > 0 ? '#28A745' : '#888'} />
            </div>

            {/* Spending trend */}
            {timelinePoints.length >= 2 && (
              <div style={{ background:'#fff', borderRadius:16, padding:'16px', marginBottom:12, boxShadow:'0 1px 4px rgba(0,0,0,0.07)' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#333', marginBottom:12 }}>Spending Trend</div>
                <LineChart points={timelinePoints} height={90} />
              </div>
            )}

            {/* Category breakdown */}
            {data.categories.length > 0 && (
              <div style={{ background:'#fff', borderRadius:16, padding:'16px', marginBottom:12, boxShadow:'0 1px 4px rgba(0,0,0,0.07)' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#333', marginBottom:12 }}>By Category</div>
                {data.categories.slice(0,5).map(cat => (
                  <div key={cat.name} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:'#f0f3ea', display:'flex', alignItems:'center', justifyContent:'center', color:'#4B5320', flexShrink:0 }}>
                    {(() => { const Icon = CatIcons[cat.name] || CatIcons.other; return <Icon />; })()}
                  </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                        <span style={{ fontSize:13, fontWeight:500, color:'#333', textTransform:'capitalize' }}>{cat.name}</span>
                        <span style={{ fontSize:13, fontWeight:600, color:'#4B5320' }}>${cat.total.toFixed(0)}</span>
                      </div>
                      <div style={{ height:4, background:'#f0f0f0', borderRadius:2 }}>
                        <div style={{ height:'100%', width:`${cat.pct}%`, background: CAT_COLORS[cat.name] || '#4B5320', borderRadius:2 }} />
                      </div>
                    </div>
                    <div style={{ fontSize:12, color:'#aaa', width:36, textAlign:'right' }}>{cat.pct}%</div>
                  </div>
                ))}
              </div>
            )}

            {/* Groups breakdown */}
            {data.groups.length > 0 && (
              <div style={{ background:'#fff', borderRadius:16, padding:'16px', marginBottom:12, boxShadow:'0 1px 4px rgba(0,0,0,0.07)' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#333', marginBottom:12 }}>By Group</div>
                {data.groups.map((g, i) => (
                  <div key={g.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom: i < data.groups.length-1 ? 12 : 0 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:'#f0f3ea', display:'flex', alignItems:'center', justifyContent:'center', color:'#4B5320' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:500, color:'#333' }}>{g.name}</div>
                      <div style={{ fontSize:12, color:'#aaa' }}>{g.count} expense{g.count !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:'#4B5320' }}>${g.total.toFixed(0)}</div>
                      <button
                        onClick={() => handleDeleteGroup(g.id)}
                        disabled={deletingGroupId === g.id}
                        style={{ background:'none', border:'none', cursor:'pointer', padding:'4px', color:'#ccc', display:'flex', alignItems:'center', opacity: deletingGroupId === g.id ? 0.4 : 1 }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent expenses */}
            {data.recentExpenses.length > 0 && (
              <div style={{ background:'#fff', borderRadius:16, padding:'16px', marginBottom:12, boxShadow:'0 1px 4px rgba(0,0,0,0.07)' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#333', marginBottom:12 }}>Recent Activity</div>
                {data.recentExpenses.map((e, i) => (
                  <div key={e.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom: i < data.recentExpenses.length-1 ? 12 : 0 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:'#f0f3ea', display:'flex', alignItems:'center', justifyContent:'center', color:'#4B5320', flexShrink:0 }}>
                    {(() => { const Icon = CatIcons[e.category] || CatIcons.other; return <Icon />; })()}
                  </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:500, color:'#333' }}>{e.description}</div>
                      <div style={{ fontSize:12, color:'#aaa' }}>{e.group_name} · {e.paid_by}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:'#4B5320' }}>${(e.amount_usd||0).toFixed(0)}</div>
                      <button
                        onClick={() => handleDeleteExpense(e.id)}
                        disabled={deletingId === e.id}
                        style={{ background:'none', border:'none', cursor:'pointer', padding:'4px', color:'#ccc', display:'flex', alignItems:'center', opacity: deletingId === e.id ? 0.4 : 1 }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pro upsell if not pro */}
            {!isPro && (
              <div style={{ background:'linear-gradient(135deg, #4B5320, #6B7B3A)', borderRadius:16, padding:'20px', textAlign:'center', marginBottom:8 }}>
                <div style={{ fontSize:16, fontWeight:700, color:'#fff', marginBottom:6, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  <SparkleIcon /> Unlock Full Analytics
                </div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.8)', marginBottom:16 }}>Per-group breakdowns, member summaries & spending trends</div>
                <button onClick={() => onNavigate('pro')} style={{ background:'#fff', color:'#4B5320', border:'none', borderRadius:10, padding:'10px 24px', fontSize:14, fontWeight:700, cursor:'pointer' }}>Upgrade to Pro</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Group-specific Analytics (existing, Pro only) ────────────────────────────
function GroupAnalytics({ activeGroup, onNavigate, onToast, paymentStatus, hideHeader }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('overview');
  const [monthIdx, setMonthIdx] = useState(null);

  const handleExport = async () => {
    try {
      const API   = import.meta.env.VITE_API_URL || 'https://splitmate-production-9382.up.railway.app';
      const token = window.Telegram?.WebApp?.initData || '';
      if (!token) { onToast('Open in Telegram to export', 'error'); return; }
      const resp = await fetch(`${API}/api/expenses/${activeGroup.id}/export`, { headers: { 'x-telegram-init-data': token } });
      if (!resp.ok) throw new Error('Export failed');
      const blob = await resp.blob();
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `splitmate-${activeGroup.name.replace(/[^a-z0-9]/gi, '-')}.csv`, { type: 'text/csv' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `${activeGroup.name} expenses` });
          onToast('CSV shared! 📤');
          return;
        }
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (window.Telegram?.WebApp?.openLink) window.Telegram.WebApp.openLink(reader.result);
        else { const a = document.createElement('a'); a.href = reader.result; a.download = `splitmate-${activeGroup.name.replace(/[^a-z0-9]/gi, '-')}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
      };
      reader.readAsDataURL(blob);
      onToast('CSV ready! 📋');
    } catch (err) {
      if (err.name !== 'AbortError') onToast(err.message, 'error');
    }
  };

  useEffect(() => {
    if (!paymentStatus?.isPro) { setLoading(false); return; }
    api.expenses.analytics(activeGroup.id)
      .then(d => { setData(d); setMonthIdx(d.timeline?.length - 1); })
      .catch(err => onToast(err.message || 'Failed to load analytics', 'error'))
      .finally(() => setLoading(false));
  }, [activeGroup, paymentStatus]);

  // Still loading payment status — show spinner
  if (paymentStatus === null) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'60px 0' }}>
        <div style={{ width:24, height:24, border:'3px solid #e0e0e0', borderTopColor:'#4B5320', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  if (!paymentStatus?.isPro) {
    return (
      <div style={{ minHeight:'100vh', background:'#F5F5F5' }}>
        {!hideHeader && (
          <div className="page-header">
            <button className="btn-icon" onClick={() => onNavigate('group-detail')} style={{ fontSize:20, background:'#F5F5F5' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#4B5320" strokeWidth="2"/><path d="M12 8L8 12L12 16" stroke="#4B5320" strokeWidth="2" strokeLinecap="round"/><path d="M16 12H8" stroke="#4B5320" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
            <div className="page-header-title">{activeGroup.name}</div>
          </div>
        )}
        <div style={{ padding:'48px 24px', textAlign:'center' }}>
          <div style={{ width:56, height:56, borderRadius:16, background:'#f0f3ea', display:'flex', alignItems:'center', justifyContent:'center', color:'#4B5320', marginBottom:16 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </div>
          <div style={{ fontSize:24, fontWeight:700, color:'#333', marginBottom:8 }}>Pro Feature</div>
          <div style={{ fontSize:16, color:'#aaa', lineHeight:'24px', marginBottom:32 }}>Spending analytics, category breakdowns,<br/>member summaries & spending trends.</div>
          <button className="btn-primary" onClick={() => onNavigate('pro')} style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
            <SparkleIcon /> Upgrade to Pro
          </button>
          <div style={{ fontSize:12, color:'#aaa', marginTop:12 }}>Cheaper than Splitwise · Cancel anytime</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'#F5F5F5', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
        <div style={{ width:24, height:24, border:'3px solid #e0e0e0', borderTopColor:'#4B5320', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
        <div style={{ fontSize:14, color:'#aaa' }}>Loading analytics…</div>
      </div>
    );
  }

  if (!data) return null;

  const { totalUsd, categories, members, timeline, expenseCount } = data;
  const weekPoints = (timeline || []).map(t => ({ value: t.total, label: `W${t.week?.split('-W')[1] || ''}` }));
  const selMonth   = monthIdx !== null ? (timeline || [])[monthIdx] : null;

  const Tabs = ['overview', 'members', 'timeline'];

  return (
    <div style={{ minHeight:'100vh', background:'#F5F5F5', paddingBottom:32 }}>
      {!hideHeader && (
        <div className="page-header">
          <button className="btn-icon" onClick={() => onNavigate('group-detail')} style={{ fontSize:20, background:'#F5F5F5' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#4B5320" strokeWidth="2"/><path d="M12 8L8 12L12 16" stroke="#4B5320" strokeWidth="2" strokeLinecap="round"/><path d="M16 12H8" stroke="#4B5320" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <div className="page-header-title">{activeGroup.name}</div>
          <button className="btn-icon" onClick={handleExport} title="Export CSV" style={{ background:'#F5F5F5' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#4B5320" strokeWidth="2" strokeLinecap="round"/><polyline points="7 10 12 15 17 10" stroke="#4B5320" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="15" x2="12" y2="3" stroke="#4B5320" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>
      )}

      {/* Export button inline when header hidden */}
      {hideHeader && (
        <div style={{ display:'flex', justifyContent:'flex-end', padding:'8px 16px 0' }}>
          <button className="btn-icon" onClick={handleExport} title="Export CSV" style={{ background:'#e8ede0', borderRadius:10, padding:'8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#4B5320" strokeWidth="2" strokeLinecap="round"/><polyline points="7 10 12 15 17 10" stroke="#4B5320" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="15" x2="12" y2="3" stroke="#4B5320" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, margin:'0 16px 16px', background:'#e8ede0', borderRadius:12, padding:3 }}>
        {Tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex:1, padding:'8px 0', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', background: tab===t ? '#4B5320' : 'transparent', color: tab===t ? '#fff' : '#6B7B3A', transition:'all 0.2s' }}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ padding:'0 16px' }}>
        {tab === 'overview' && (
          <>
            <div style={{ display:'flex', gap:10, marginBottom:12 }}>
              <StatCard label="Total Spent" value={`$${totalUsd.toFixed(0)}`} sub={`${expenseCount} expenses`} />
              <StatCard label="Categories" value={categories.length} />
            </div>
            {categories.map(cat => (
              <div key={cat.name} style={{ background:'#fff', borderRadius:14, padding:'14px 16px', marginBottom:8, display:'flex', alignItems:'center', gap:12, boxShadow:'0 1px 4px rgba(0,0,0,0.07)' }}>
                <div style={{ fontSize:22 }}>{CatIcons[cat.name] || CatIcons.other}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:14, fontWeight:500, color:'#333', textTransform:'capitalize' }}>{cat.name}</span>
                    <span style={{ fontSize:14, fontWeight:700, color:'#4B5320' }}>${cat.total.toFixed(2)}</span>
                  </div>
                  <div style={{ height:4, background:'#f0f0f0', borderRadius:2 }}>
                    <div style={{ height:'100%', width:`${cat.pct}%`, background: CAT_COLORS[cat.name] || '#4B5320', borderRadius:2 }} />
                  </div>
                </div>
                <div style={{ fontSize:12, color:'#aaa', width:36, textAlign:'right' }}>{cat.pct}%</div>
              </div>
            ))}
          </>
        )}

        {tab === 'members' && (
          <>
            {members.map(m => (
              <div key={m.id} style={{ background:'#fff', borderRadius:14, padding:'14px 16px', marginBottom:8, boxShadow:'0 1px 4px rgba(0,0,0,0.07)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <span style={{ fontSize:15, fontWeight:600, color:'#333' }}>{m.name}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:'#4B5320' }}>paid ${m.paid.toFixed(2)}</span>
                </div>
                <div style={{ display:'flex', gap:16 }}>
                  <div style={{ fontSize:12, color:'#aaa' }}>Owes: <b style={{ color:'#DC3545' }}>${m.owed.toFixed(2)}</b></div>
                  <div style={{ fontSize:12, color:'#aaa' }}>Net: <b style={{ color: m.paid - m.owed >= 0 ? '#28A745' : '#DC3545' }}>${(m.paid - m.owed).toFixed(2)}</b></div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'timeline' && (
          <div style={{ background:'#fff', borderRadius:16, padding:'16px', boxShadow:'0 1px 4px rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize:14, fontWeight:600, color:'#333', marginBottom:16 }}>Weekly Spending</div>
            {weekPoints.length >= 2 ? (
              <>
                <LineChart points={weekPoints} height={100} />
                <div style={{ marginTop:16, display:'flex', gap:6, flexWrap:'wrap' }}>
                  {(timeline||[]).map((t, i) => (
                    <button key={i} onClick={() => setMonthIdx(i)} style={{ padding:'6px 10px', borderRadius:8, border:'none', background: monthIdx===i ? '#4B5320' : '#f0f3ea', color: monthIdx===i ? '#fff' : '#4B5320', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                      W{t.week?.split('-W')[1]}
                    </button>
                  ))}
                </div>
                {selMonth && (
                  <div style={{ marginTop:12, padding:'12px', background:'#f7f8f5', borderRadius:10 }}>
                    <div style={{ fontSize:13, color:'#666' }}>Week {selMonth.week?.split('-W')[1]}</div>
                    <div style={{ fontSize:22, fontWeight:700, color:'#4B5320' }}>${selMonth.total.toFixed(2)}</div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign:'center', padding:'32px 0', color:'#aaa', fontSize:14 }}>Not enough data yet</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Analytics export ─────────────────────────────────────────────────────
export default function Analytics({ onNavigate, onToast }) {
  const { activeGroup, paymentStatus } = useAppStore();
  // Default to 'account'. If a group is active AND user navigated here from group, default to 'group'.
  const [scope, setScope] = useState(activeGroup ? 'group' : 'account');

  // Keep scope in sync if activeGroup changes (e.g. group deleted)
  useEffect(() => {
    if (!activeGroup && scope === 'group') setScope('account');
  }, [activeGroup]);

  return (
    <div style={{ minHeight:'100vh', background:'#F5F5F5' }}>
      {/* Scope toggle — always visible */}
      <div style={{ position:'sticky', top:0, zIndex:10, background:'#F5F5F5', paddingTop:8 }}>
        <div style={{ display:'flex', gap:0, margin:'0 16px 0', background:'#e8ede0', borderRadius:12, padding:3 }}>
          <button
            onClick={() => setScope('account')}
            style={{ flex:1, padding:'9px 0', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', background: scope==='account' ? '#4B5320' : 'transparent', color: scope==='account' ? '#fff' : '#6B7B3A', transition:'all 0.2s' }}
          >
            <span style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              My Account
            </span>
          </button>
          <button
            onClick={() => setScope('group')}
            style={{ flex:1, padding:'9px 0', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', background: scope==='group' ? '#4B5320' : 'transparent', color: scope==='group' ? '#fff' : '#6B7B3A', transition:'all 0.2s' }}
          >
            <span style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              {activeGroup ? activeGroup.name : 'Group'}
            </span>
          </button>
        </div>
      </div>

      {scope === 'account'
        ? <GlobalDashboard onNavigate={onNavigate} onToast={onToast} paymentStatus={paymentStatus} hideHeader />
        : activeGroup
          ? <GroupAnalytics activeGroup={activeGroup} onNavigate={onNavigate} onToast={onToast} paymentStatus={paymentStatus} hideHeader />
          : (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 24px', gap:12, textAlign:'center' }}>
              <div style={{ width:48, height:48, borderRadius:14, background:'#f0f3ea', display:'flex', alignItems:'center', justifyContent:'center', color:'#4B5320' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div style={{ fontSize:16, fontWeight:700, color:'#333' }}>No group selected</div>
              <div style={{ fontSize:13, color:'#888', lineHeight:'20px' }}>Open a group first, then come back to see group analytics.</div>
              <button className="btn-primary" onClick={() => onNavigate('groups')} style={{ marginTop:8 }}>Go to Groups</button>
            </div>
          )
      }
    </div>
  );
}
