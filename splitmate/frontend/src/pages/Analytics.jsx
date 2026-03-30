// Analytics.jsx — spec §3.3 — light theme, military green
import React, { useState, useEffect } from 'react';
import { CatIcons } from '../components/Icons.jsx';
import useAppStore from '../store/appStore.js';
import api from '../utils/api.js';

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// spec §2.4 category dots — #4B5320, #DC3545, #FFC107, etc.
const CAT_COLORS = { food:'#4B5320', transport:'#6B7B3A', accommodation:'#8F974B', entertainment:'#DC3545', shopping:'#FFC107', health:'#28A745', utilities:'#3A4219', other:'#CCCCCC', general:'#CCCCCC' };

function fmtMonth(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return `${MONTH_ABBR[parseInt(m,10)-1]} ${y.slice(2)}`;
}

// Mini bar chart — spec §2.6
function MiniBarChart({ data, maxVal }) {
  if (!data || data.length === 0) return null;
  const max = maxVal || Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:40 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
          <div style={{
            width:'100%',
            height: Math.max(4, Math.round((d.value / max) * 36)),
            background: d.active ? '#4B5320' : '#6B7B3A',
            borderRadius:'2px 2px 0 0',
            transition:'height 0.4s ease',
          }} />
          <div style={{ fontSize:9, color:'#CCCCCC', lineHeight:1 }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// Line chart — spec §2.6 — pure SVG, no library needed
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

  // highest point label
  const maxIdx = points.indexOf(points.reduce((a,b) => b.value > a.value ? b : a));

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow:'visible' }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6B7B3A" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="#6B7B3A" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* Fill — spec: gradient from Light Green to transparent */}
      <path d={fillD} fill="url(#lineGrad)" />
      {/* Line — spec: Primary Green #4B5320 */}
      <path d={pathD} fill="none" stroke="#4B5320" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Data point label at max */}
      {(() => {
        const x = toX(maxIdx); const y = toY(points[maxIdx].value);
        return (
          <g>
            <circle cx={x} cy={y} r="4" fill="#4B5320"/>
            {/* White card label — spec §2.6 */}
            <rect x={x-24} y={y-26} width={48} height={18} rx="4" fill="#fff" filter="drop-shadow(0 1px 3px rgba(0,0,0,0.1))"/>
            <text x={x} y={y-13} textAnchor="middle" fontSize="10" fontWeight="700" fill="#4B5320">${points[maxIdx].value.toFixed(0)}</text>
          </g>
        );
      })()}
      {/* X axis labels */}
      {points.filter((_,i) => i % Math.ceil(points.length/5) === 0).map((p,i,arr) => {
        const origIdx = points.indexOf(p);
        return <text key={i} x={toX(origIdx)} y={height-2} textAnchor="middle" fontSize="10" fill="#CCCCCC">{p.label}</text>;
      })}
    </svg>
  );
}

export default function Analytics({ onNavigate, onToast }) {
  const { activeGroup, paymentStatus } = useAppStore();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('overview');
  const [monthIdx, setMonthIdx] = useState(null);

  useEffect(() => {
    if (!activeGroup) return;
    if (!paymentStatus?.isPro) { setLoading(false); return; }
    api.expenses.analytics(activeGroup.id)
      .then(d => { setData(d); setMonthIdx(d.timeline?.length - 1); })
      .catch(err => onToast(err.message || 'Failed to load analytics', 'error'))
      .finally(() => setLoading(false));
  }, [activeGroup]);

  if (!activeGroup) { onNavigate('groups'); return null; }

  // ── Pro gate — spec §3.1 style ─────────────────────────────────────────────
  if (!paymentStatus?.isPro) {
    return (
      <div style={{ minHeight:'100vh', background:'#F5F5F5' }}>
        <div className="page-header">
          <button className="btn-icon" onClick={() => onNavigate('group-detail')} style={{ fontSize:20, background:'#F5F5F5' }}>‹</button>
          <div className="page-header-title">Analytics</div>
        </div>
        <div style={{ padding:'48px 24px', textAlign:'center' }}>
          <div style={{ fontSize:56, marginBottom:16 }}>📊</div>
          {/* Heading 1 — 24px bold */}
          <div style={{ fontSize:24, fontWeight:700, color:'#333', marginBottom:8 }}>Pro Feature</div>
          {/* Body Large — 16px */}
          <div style={{ fontSize:16, color:'#CCCCCC', lineHeight:'24px', marginBottom:32 }}>
            Spending analytics, category breakdowns,<br/>member summaries & spending trends.
          </div>
          <button className="btn-primary" onClick={() => onNavigate('pro')}>
            ⭐ Upgrade to Pro
          </button>
          <div style={{ fontSize:12, color:'#CCCCCC', marginTop:12 }}>Cheaper than Splitwise · Cancel anytime</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'#F5F5F5', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
        <div className="spinner" style={{ width:28, height:28 }} />
        <div style={{ fontSize:14, color:'#CCCCCC' }}>Loading analytics…</div>
      </div>
    );
  }

  if (!data) return null;

  // Build bar chart data from timeline (last 7 periods or day-of-week)
  const barData = (data.timeline || []).slice(-7).map((t,i,arr) => ({
    value: t.total,
    label: fmtMonth(t.month).split(' ')[0],
    active: i === arr.length - 1,
  }));

  // Build line chart points
  const linePoints = (data.timeline || []).map(t => ({
    value: t.total,
    label: fmtMonth(t.month).split(' ')[0],
  }));

  const selectedMonth = data.timeline?.[monthIdx];
  const totalGroupExpenses = data.totalUsd || 0;

  return (
    <div style={{ minHeight:'100vh', background:'#F5F5F5', paddingBottom:100 }}>

      {/* ── Header — spec §2.11 ── */}
      <div className="page-header">
        <button className="btn-icon" onClick={() => onNavigate('group-detail')} style={{ fontSize:20, background:'#F5F5F5' }}>‹</button>
        <div style={{ flex:1 }}>
          {/* Heading 1 24px bold */}
          <div className="page-header-title">Analytics</div>
          <div className="page-header-sub">{activeGroup.name}</div>
        </div>
      </div>

      <div style={{ padding:'24px 24px 0' }}>

        {/* ── My Contributions Card — spec §3.3 ── */}
        <div className="card animate-in" style={{ marginBottom:24 }}>
          {/* Heading 2 — 20px semibold */}
          <div style={{ fontSize:20, fontWeight:600, color:'#333', lineHeight:'28px', marginBottom:4 }}>My Contributions</div>
          {/* Display — 32px bold */}
          <div style={{ fontSize:32, fontWeight:700, color:'#333', lineHeight:'40px', marginBottom:4 }}>
            ${(data.myTotal || 0).toFixed(2)}
          </div>
          {/* Change indicator — spec §3.3 */}
          {data.changePercent !== undefined && (
            <div style={{ fontSize:12, color: data.changePercent >= 0 ? '#4B5320' : '#DC3545', fontWeight:600, marginBottom:16 }}>
              {data.changePercent >= 0 ? '↑' : '↓'} {Math.abs(data.changePercent).toFixed(1)}% from last period
            </div>
          )}
          {/* Mini bar chart — spec §2.6 bars: Light Green #6B7B3A / Primary Green #4B5320 */}
          <MiniBarChart data={barData} />
        </div>

        {/* ── Group Expenses Card — spec §3.3 ── */}
        <div className="card" style={{ marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:4 }}>
            <div style={{ fontSize:20, fontWeight:600, color:'#333', lineHeight:'28px' }}>Group Expenses</div>
            {/* Month/Year dropdown — spec §2.9 */}
            {data.timeline?.length > 0 && (
              <select
                value={monthIdx ?? ''}
                onChange={e => setMonthIdx(Number(e.target.value))}
                style={{ height:32, padding:'0 8px', background:'#F5F5F5', border:'none', borderRadius:4, fontSize:13, color:'#333', fontFamily:'inherit', outline:'none', cursor:'pointer' }}
              >
                {data.timeline.map((t,i) => (
                  <option key={i} value={i}>{fmtMonth(t.month)}</option>
                ))}
              </select>
            )}
          </div>
          {/* Display amount */}
          <div style={{ fontSize:32, fontWeight:700, color:'#DC3545', lineHeight:'40px', marginBottom:16 }}>
            -${(selectedMonth?.total || totalGroupExpenses).toFixed(2)}
          </div>
          {/* Main line chart — spec §2.6 */}
          {linePoints.length >= 2 && <LineChart points={linePoints} width={320} height={100} />}
        </div>

        {/* ── Tabs ── */}
        <div className="tabs" style={{ marginBottom:16 }}>
          {[['overview','📊 Overview'],['members','👥 Members'],['timeline','📈 Timeline']].map(([key,label]) => (
            <button key={key} className={`tab ${tab===key?'active':''}`} onClick={()=>setTab(key)} style={{ fontSize:11 }}>{label}</button>
          ))}
        </div>

        {/* ══ Overview ══ */}
        {tab === 'overview' && (
          <div className="animate-in">
            {/* Expense Breakdown — spec §3.3 Category List Items */}
            <div style={{ fontSize:20, fontWeight:600, color:'#333', lineHeight:'28px', marginBottom:16 }}>Expense Breakdown</div>
            <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:24 }}>
              {data.categories?.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">📊</div><div className="empty-title">No data yet</div></div>
              ) : data.categories?.map((cat,i) => (
                <div key={cat.name} style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 24px', borderBottom: i < data.categories.length-1 ? '1px solid #F5F5F5' : 'none' }}>
                  {/* Dot — spec §2.4: 8px circle */}
                  <div className="cat-dot" style={{ background: CAT_COLORS[cat.name] || '#CCCCCC' }} />
                  {/* Category name — Body Large 16px regular #333 */}
                  <div style={{ flex:1, fontSize:16, color:'#333', lineHeight:'24px' }}>
                    {(() => { const I = CatIcons[cat.name]||CatIcons.other; return <span style={{display:'inline-flex',verticalAlign:'middle',marginRight:6}}><I /></span>; })()} {cat.name.charAt(0).toUpperCase()+cat.name.slice(1)}
                  </div>
                  {/* Amount — Body Large 16px regular #333 */}
                  <div style={{ fontSize:16, color:'#333', lineHeight:'24px', fontWeight:500 }}>
                    ${cat.total.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Top 5 biggest */}
            {data.top5?.length > 0 && (
              <>
                <div style={{ fontSize:20, fontWeight:600, color:'#333', marginBottom:16 }}>Biggest Expenses</div>
                <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:24 }}>
                  {data.top5.map((e,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 24px', borderBottom: i < data.top5.length-1 ? '1px solid #F5F5F5':'none' }}>
                      <div className="avatar" style={{ borderRadius:'50%', background:'#F5F5F5', fontSize:18 }}>
                        {(() => { const I = CatIcons[e.category]||CatIcons.other; return <I />; })()}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:16, color:'#333', fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{e.description}</div>
                        <div style={{ fontSize:12, color:'#CCCCCC' }}>{e.paidBy} · {e.date}</div>
                      </div>
                      <div style={{ fontSize:16, fontWeight:600, color:'#4B5320' }}>{e.currency} {e.amount.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Stats row */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
              {[
                { label:'Total Spent',  value:`$${data.totalUsd?.toFixed(2)||'0.00'}`,   icon:'💸' },
                { label:'Expenses',     value: data.expenseCount || 0,                   icon:'🧾' },
                { label:'Settled',      value:`${data.settlementRate||0}%`,               icon:'✅' },
                { label:'Members',      value: data.members?.length || 0,                 icon:'👥' },
              ].map((s,i) => (
                <div key={i} className="card-sm" style={{ textAlign:'center' }}>
                  <div style={{ fontSize:24, marginBottom:6 }}>{s.icon}</div>
                  <div style={{ fontSize:20, fontWeight:700, color:'#333', lineHeight:'28px' }}>{s.value}</div>
                  <div style={{ fontSize:12, color:'#CCCCCC' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ Members ══ */}
        {tab === 'members' && (
          <div className="animate-in">
            <div style={{ fontSize:20, fontWeight:600, color:'#333', marginBottom:16 }}>Who Paid the Most</div>
            {!data.members?.length ? (
              <div className="card"><div className="empty-state"><div className="empty-icon">👥</div><div className="empty-title">No member data</div></div></div>
            ) : (
              <div className="card" style={{ padding:0, overflow:'hidden' }}>
                {data.members.map((m,i) => {
                  const maxPaid = Math.max(...data.members.map(x=>x.paid),1);
                  const pct = Math.round((m.paid/maxPaid)*100);
                  return (
                    <div key={m.id} style={{ padding:'16px 24px', borderBottom: i < data.members.length-1 ? '1px solid #F5F5F5':'none' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:10 }}>
                        <div className="avatar" style={{ borderRadius:'50%', background:`hsl(${i*70+120},40%,85%)`, color:`hsl(${i*70+120},50%,30%)`, fontWeight:700 }}>
                          {m.name?.charAt(0)?.toUpperCase()||'?'}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:16, color:'#333', fontWeight:500 }}>{m.name}</div>
                          <div style={{ fontSize:12, color:'#CCCCCC' }}>
                            Paid ${m.paid?.toFixed(2)||'0'} · Owes ${m.owes?.toFixed(2)||'0'}
                          </div>
                        </div>
                        <div style={{ fontSize:16, fontWeight:600, color: m.net > 0 ? '#4B5320' : '#DC3545' }}>
                          {m.net > 0 ? '+' : ''}${m.net?.toFixed(2)||'0'}
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div style={{ height:6, background:'#F5F5F5', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background: i===0?'#4B5320':'#6B7B3A', borderRadius:3, transition:'width 0.5s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ Timeline ══ */}
        {tab === 'timeline' && (
          <div className="animate-in">
            <div style={{ fontSize:20, fontWeight:600, color:'#333', marginBottom:16 }}>Monthly Spending</div>
            {!data.timeline?.length ? (
              <div className="card"><div className="empty-state"><div className="empty-icon">📈</div><div className="empty-title">No timeline data</div></div></div>
            ) : (
              <div>
                {data.timeline.slice().reverse().map((t,i) => (
                  <div key={i} className="card" style={{ marginBottom:12, display:'flex', alignItems:'center', gap:16 }}>
                    <div style={{ width:48, height:48, borderRadius:12, background:'#F5F5F5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#CCCCCC', textAlign:'center', lineHeight:1.2, flexShrink:0 }}>
                      {fmtMonth(t.month)}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:24, fontWeight:700, color:'#333', lineHeight:'32px' }}>${t.total?.toFixed(2)}</div>
                      <div style={{ fontSize:12, color:'#CCCCCC' }}>{t.count} expense{t.count!==1?'s':''}</div>
                    </div>
                    {i === 0 && <span className="badge badge-success" style={{ fontSize:10 }}>Latest</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
