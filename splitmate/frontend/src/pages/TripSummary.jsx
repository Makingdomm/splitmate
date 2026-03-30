// =============================================================================
// TripSummary.jsx — Shareable read-only trip expense summary
// Accessible at: /summary?group=<groupId>
// Works without authentication for viewing (data fetched via share token in URL)
// For generation: user must be authenticated
// =============================================================================

import React, { useEffect, useState } from 'react';
import useAppStore from '../store/appStore.js';
import { api } from '../utils/api.js';

const CATEGORY_EMOJI = {
  food: '🍕', transport: '🚗', accommodation: '🏨', entertainment: '🎉',
  shopping: '🛍️', drinks: '🍻', activities: '🎯', health: '💊',
  utilities: '💡', other: '📦',
};

const FRONTEND_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('splitmate-production', 'frontend-jade-iota-89.vercel.app').replace('.up.railway.app', '')
  : 'https://frontend-jade-iota-89.vercel.app';

export default function TripSummary({ onNavigate, onToast }) {
  const { activeGroup, paymentStatus } = useAppStore();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const isGroupPro = activeGroup?.is_pro;
  const isPro = paymentStatus?.isPro || isGroupPro;

  useEffect(() => {
    if (!activeGroup) return;
    setLoading(true);
    api.expenses.summary(activeGroup.id)
      .then(setSummary)
      .catch(err => onToast(err.message || 'Failed to load summary', 'error'))
      .finally(() => setLoading(false));
  }, [activeGroup?.id]);

  if (!activeGroup) {
    onNavigate('groups');
    return null;
  }

  const shareUrl = `https://t.me/SplitMateExpenseBot?start=summary_${activeGroup.id}`;

  const handleShare = async () => {
    setSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${activeGroup.name} — Trip Summary`,
          text: `Check out our group expenses for ${activeGroup.name} 💸`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        onToast('Link copied!', 'success');
      }
    } catch (e) {
      // user cancelled share
    } finally {
      setSharing(false);
    }
  };

  const handleTelegramShare = () => {
    const text = encodeURIComponent(`💸 *${activeGroup.name} — Trip Summary*\n\n📊 ${summary?.expenseCount || 0} expenses · $${summary?.totalUsd?.toFixed(2) || '0.00'} total\n✅ ${summary?.settlementRate || 0}% settled\n\nView full breakdown 👇`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`, '_blank');
  };

  const StatCard = ({ icon, label, value, sub }) => (
    <div style={{ flex:1, minWidth:0, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'14px 12px', textAlign:'center' }}>
      <div style={{ fontSize:22, marginBottom:4 }}>{icon}</div>
      <div style={{ fontSize:18, fontWeight:900, color:'#fff', letterSpacing:-0.5 }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:'#6a7090', marginBottom:2 }}>{sub}</div>}
      <div style={{ fontSize:11, color:'#4a5080', marginTop:2 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#0d0f1a', paddingBottom:32 }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(180deg,#1a1d30 0%,#0d0f1a 100%)', padding:'16px 16px 20px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <button onClick={() => onNavigate('group-detail')}
            style={{ width:36, height:36, borderRadius:12, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            ‹
          </button>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, color:'#4a5080', fontWeight:600, textTransform:'uppercase', letterSpacing:1 }}>Trip Summary</div>
            <div style={{ fontSize:17, fontWeight:800, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {activeGroup.name}
            </div>
          </div>
          <div style={{ fontSize:20 }}>📊</div>
        </div>

        {/* Members */}
        {summary?.members?.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {summary.members.map((m, i) => (
              <span key={i} style={{ fontSize:12, fontWeight:600, color:'#8899bb', background:'rgba(255,255,255,0.05)', borderRadius:20, padding:'3px 10px' }}>
                {m}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding:'20px 16px 0' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:'#4a5080' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
            <div style={{ fontSize:14 }}>Loading summary...</div>
          </div>
        ) : summary ? (
          <>
            {/* Stats row */}
            <div style={{ display:'flex', gap:10, marginBottom:20 }}>
              <StatCard icon="💸" label="Total Spent" value={`$${summary.totalUsd.toFixed(2)}`} sub="USD equiv." />
              <StatCard icon="🧾" label="Expenses" value={summary.expenseCount} />
              <StatCard icon="✅" label="Settled" value={`${summary.settlementRate}%`} />
            </div>

            {/* Category breakdown */}
            {summary.categories?.length > 0 && (
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'16px', marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#8899bb', marginBottom:12, letterSpacing:0.3 }}>SPENDING BY CATEGORY</div>
                {summary.categories.map((cat, i) => (
                  <div key={i} style={{ marginBottom: i < summary.categories.length-1 ? 12 : 0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:16 }}>{CATEGORY_EMOJI[cat.name] || '📦'}</span>
                        <span style={{ fontSize:13, fontWeight:600, color:'#ccd3e8', textTransform:'capitalize' }}>{cat.name}</span>
                      </div>
                      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                        <span style={{ fontSize:11, color:'#4a5080' }}>{cat.pct}%</span>
                        <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>${cat.total.toFixed(2)}</span>
                      </div>
                    </div>
                    <div style={{ height:5, background:'rgba(255,255,255,0.06)', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${cat.pct}%`, background:'linear-gradient(90deg,#4f8e02,#6fc104)', borderRadius:4, transition:'width 0.6s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Top expenses */}
            {summary.top5?.length > 0 && (
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'16px', marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#8899bb', marginBottom:12, letterSpacing:0.3 }}>TOP EXPENSES</div>
                {summary.top5.map((e, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom: i < summary.top5.length-1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <div style={{ width:30, height:30, borderRadius:10, background:'rgba(79,142,2,0.15)', border:'1px solid rgba(79,142,2,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:14 }}>
                      {CATEGORY_EMOJI[e.category] || '📦'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{e.description}</div>
                      <div style={{ fontSize:11, color:'#4a5080' }}>by {e.paidBy} · {e.date}</div>
                    </div>
                    <div style={{ fontSize:14, fontWeight:800, color:'#6fc104', flexShrink:0 }}>
                      {e.amount.toFixed(2)} {e.currency}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Share section */}
            <div style={{ background:'linear-gradient(135deg,rgba(79,142,2,0.08),rgba(111,193,4,0.04))', border:'1px solid rgba(79,142,2,0.2)', borderRadius:20, padding:'16px', marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#6fc104', marginBottom:6 }}>📤 Share this summary</div>
              <div style={{ fontSize:12, color:'#4a5070', marginBottom:14, lineHeight:1.5 }}>
                Send a read-only snapshot of your group expenses to friends, family, or your Airbnb host.
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button
                  onClick={handleTelegramShare}
                  style={{ flex:1, height:42, background:'linear-gradient(135deg,#229ED9,#1a8cc0)', border:'none', borderRadius:14, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  ✈️ Share on Telegram
                </button>
                <button
                  onClick={handleShare}
                  disabled={sharing}
                  style={{ height:42, padding:'0 16px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  {copied ? '✅' : '🔗'}
                </button>
              </div>
            </div>

            {/* Generated at */}
            <div style={{ textAlign:'center', fontSize:11, color:'#2a3050', marginTop:8 }}>
              Generated by SplitMate · {new Date(summary.generatedAt).toLocaleDateString()}
            </div>
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'60px 0', color:'#4a5080' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>🤷</div>
            <div style={{ fontSize:14 }}>No data available</div>
          </div>
        )}
      </div>
    </div>
  );
}
