import React, { useState } from 'react';
import useAppStore from '../store/appStore.js';

const CATEGORY_EMOJI = {
  food: '🍕', transport: '🚗', accommodation: '🏨',
  entertainment: '🎬', shopping: '🛍️', health: '💊',
  utilities: '💡', general: '💰',
};

export default function GroupDetail({ onNavigate, onToast }) {
  const { activeGroup, expenses, balances, user, deleteExpense, paymentStatus } = useAppStore();
  const [tab, setTab] = useState('expenses');

  if (!activeGroup) { onNavigate('groups'); return null; }

  const handleBack = () => onNavigate('groups');

  const handleDelete = async (expenseId) => {
    window.Telegram?.WebApp?.showConfirm('Delete this expense? This cannot be undone.', async (ok) => {
      if (ok) try { await deleteExpense(expenseId); onToast('Expense deleted'); }
      catch (err) { onToast(err.message, 'error'); }
    });
  };

  const handleSettle = (transaction) => {
    useAppStore.setState({ pendingSettlement: transaction });
    onNavigate('settle');
  };

  const handleExport = async () => {
    if (!paymentStatus?.isPro) { onNavigate('pro'); return; }
    try {
      const API = import.meta.env.VITE_API_URL || '';
      const token = window.Telegram?.WebApp?.initData || '';
      if (!token) { onToast('Open this in Telegram to export', 'error'); return; }
      const resp = await fetch(`${API}/api/expenses/${activeGroup.id}/export`, {
        headers: { 'x-telegram-init-data': token },
      });
      if (!resp.ok) {
        let errMsg = 'Export failed';
        try { const e = await resp.json(); errMsg = e.message || e.error || errMsg; } catch {}
        throw new Error(errMsg);
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `splitmate-${activeGroup.name.replace(/[^a-z0-9]/gi, '-')}.csv`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      onToast('CSV downloaded! 📊');
    } catch (err) { onToast(err.message, 'error'); }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const myId = user?.id;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #060818 0%, #0a0f2e 40%, #060818 100%)',
      paddingBottom: 100,
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes fab-pulse {
          0%,100% { box-shadow: 0 4px 24px rgba(79,142,247,0.5); }
          50%      { box-shadow: 0 4px 36px rgba(79,142,247,0.75); }
        }
        .expense-row:active { transform: scale(0.985); }
        .settle-card:active  { transform: scale(0.985); }
        .fab-add:active      { transform: scale(0.94); }
      `}</style>

      {/* Ambient glows */}
      <div style={{ position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)', width:360, height:360, background:'radial-gradient(circle, rgba(59,110,246,0.13) 0%, transparent 65%)', borderRadius:'50%', pointerEvents:'none' }} />

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'20px 16px 16px', position:'relative', zIndex:1 }}>
        <button onClick={handleBack} style={{
          width:36, height:36, borderRadius:12, border:'1px solid rgba(255,255,255,0.1)',
          background:'rgba(255,255,255,0.06)', color:'#a0b0e0', fontSize:18,
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
        }}>‹</button>
        <div style={{ flex:1, minWidth:0 }}>
          <h1 style={{ fontSize:20, fontWeight:900, color:'#fff', letterSpacing:-0.3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {activeGroup.name}
          </h1>
          <p style={{ fontSize:12, color:'#4a5080', fontWeight:500 }}>
            {activeGroup.member_count} members · {activeGroup.currency}
          </p>
        </div>
        <button
          onClick={() => {
            const inviteLink = `https://t.me/SplitMateBot?start=group_${activeGroup.invite_code}`;
            const shareText = `Join my expense group "${activeGroup.name}" on SplitMate!\n\n${inviteLink}`;
            // Use Telegram's native share — opens forward/share sheet
            const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(`Join my expense group "${activeGroup.name}" on SplitMate!`)}`;
            if (window.Telegram?.WebApp?.openTelegramLink) {
              window.Telegram.WebApp.openTelegramLink(shareUrl);
            } else {
              navigator.clipboard?.writeText(inviteLink);
            }
          }}
          style={{
            width:36, height:36, borderRadius:12, border:'1px solid rgba(79,142,247,0.3)',
            background:'rgba(79,142,247,0.12)', color:'#7ab4ff', fontSize:16,
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
          }}
          title="Invite"
        >🔗</button>
        <button
          onClick={handleExport}
          style={{
            width:36, height:36, borderRadius:12, border:'1px solid rgba(34,197,94,0.3)',
            background:'rgba(34,197,94,0.1)', color:'#22c55e', fontSize:14,
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
          }}
          title="Export CSV"
        >📊</button>
        <button
          onClick={() => onNavigate('wallet-settings')}
          style={{
            width:36, height:36, borderRadius:12, border:'1px solid rgba(153,69,255,0.3)',
            background:'rgba(153,69,255,0.1)', color:'#bb88ff', fontSize:14,
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
          }}
          title="My Wallets"
        >🔑</button>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{ display:'flex', margin:'0 16px 20px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:4, gap:4, position:'relative', zIndex:1 }}>
        {['expenses','balances'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex:1, height:36, borderRadius:12, border:'none',
              background: tab === t ? 'linear-gradient(135deg, rgba(79,142,247,0.25), rgba(106,94,247,0.2))' : 'transparent',
              color: tab === t ? '#a0c4ff' : '#4a5080',
              fontSize:14, fontWeight:700, cursor:'pointer',
              boxShadow: tab === t ? 'inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
              transition:'all 0.15s', textTransform:'capitalize',
              borderBottom: tab === t ? '2px solid rgba(79,142,247,0.5)' : '2px solid transparent',
            }}
          >{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {/* ── Expenses Tab ── */}
      {tab === 'expenses' && (
        <div style={{ padding:'0 16px', position:'relative', zIndex:1 }}>
          {expenses.length === 0 ? (
            <div style={{
              textAlign:'center', padding:'48px 24px',
              background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20,
            }}>
              <div style={{ fontSize:48, marginBottom:14 }}>🧾</div>
              <h3 style={{ fontSize:18, fontWeight:800, color:'#c8d0f0', marginBottom:8 }}>No expenses yet</h3>
              <p style={{ fontSize:14, color:'#4a5080', lineHeight:1.7 }}>Add the first expense to get started</p>
            </div>
          ) : (
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'4px 0' }}>
              {expenses.map((expense, i) => {
                const myShare = expense.splits?.find(s => s.user_id === myId);
                const iPaid = expense.paid_by === myId;
                const emoji = CATEGORY_EMOJI[expense.category] || '💰';
                const shareLabel = iPaid ? 'you paid' : myShare?.is_settled ? 'settled' : myShare ? `owe ${parseFloat(myShare.amount_owed).toFixed(2)}` : null;
                const shareColor = iPaid ? '#4f8ef7' : myShare?.is_settled ? '#22d47a' : '#f5c842';

                return (
                  <div key={expense.id} className="expense-row" style={{
                    display:'flex', alignItems:'center', gap:12, padding:'13px 16px',
                    borderBottom: i < expenses.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    transition:'all 0.15s',
                  }}>
                    {/* Emoji */}
                    <div style={{
                      width:40, height:40, borderRadius:13, flexShrink:0,
                      background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
                    }}>{emoji}</div>

                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:'#e8eeff', marginBottom:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {expense.description}
                      </div>
                      <div style={{ fontSize:12, color:'#4a5080', fontWeight:500 }}>
                        {expense.paid_by_name} · {formatDate(expense.created_at)}
                      </div>
                    </div>

                    {/* Amount + share */}
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:15, fontWeight:800, color:'#c8d0f0', marginBottom:3 }}>
                        {expense.currency} {parseFloat(expense.amount).toFixed(2)}
                      </div>
                      {shareLabel && (
                        <div style={{ fontSize:11, fontWeight:700, color: shareColor }}>
                          {shareLabel}
                        </div>
                      )}
                    </div>

                    {/* Delete */}
                    {iPaid && (
                      <button onClick={() => handleDelete(expense.id)} style={{
                        width:28, height:28, borderRadius:8, border:'1px solid rgba(240,82,82,0.3)',
                        background:'rgba(240,82,82,0.1)', color:'#f05252', fontSize:12,
                        cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                      }}>✕</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Balances Tab ── */}
      {tab === 'balances' && balances && (
        <div style={{ padding:'0 16px', position:'relative', zIndex:1 }}>

          {/* Who owes who */}
          <div style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 }}>
            Who Owes Who
          </div>

          {balances.transactions.length === 0 ? (
            <div style={{
              textAlign:'center', padding:'32px 24px',
              background:'rgba(34,212,122,0.05)', border:'1px solid rgba(34,212,122,0.15)', borderRadius:20, marginBottom:20,
            }}>
              <div style={{ fontSize:40, marginBottom:10 }}>🎉</div>
              <div style={{ fontSize:17, fontWeight:800, color:'#22d47a', marginBottom:6 }}>All settled up!</div>
              <div style={{ fontSize:13, color:'#4a5080' }}>No outstanding debts in this group</div>
            </div>
          ) : (
            <div style={{ marginBottom:24 }}>
              {balances.transactions.map((t, i) => {
                const iFrom = t.from.telegram_id === myId;
                return (
                  <div key={i} className="settle-card" style={{
                    background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
                    borderRadius:16, padding:'14px 16px', marginBottom:10, transition:'all 0.15s',
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom: iFrom ? 12 : 0 }}>
                      <div style={{
                        fontSize:13, fontWeight:700,
                        color: iFrom ? '#f5c842' : '#c8d0f0',
                        flex:1,
                      }}>
                        <span style={{ color: iFrom ? '#f5c842' : '#f05252', fontWeight:800 }}>
                          {iFrom ? 'You' : t.from.full_name}
                        </span>
                        <span style={{ color:'#4a5080' }}> owe </span>
                        <span style={{ fontWeight:800, color:'#c8d0f0' }}>
                          {t.to.telegram_id === myId ? 'you' : t.to.full_name}
                        </span>
                      </div>
                      <div style={{ fontSize:16, fontWeight:900, color:'#f05252', flexShrink:0 }}>
                        {activeGroup.currency} {t.amount.toFixed(2)}
                      </div>
                    </div>
                    {iFrom && (
                      <div style={{ display:'flex', gap:8 }}>
                        <button
                          onClick={() => handleSettle(t)}
                          style={{
                            flex:1, height:36, borderRadius:10, border:'1px solid rgba(79,142,247,0.4)',
                            background:'linear-gradient(135deg,rgba(79,142,247,0.2),rgba(106,94,247,0.15))',
                            color:'#7ab4ff', fontSize:13, fontWeight:700, cursor:'pointer',
                          }}
                        >Settle Up</button>
                        {paymentStatus?.isPro && t.to.ton_wallet && (
                          <button
                            onClick={() => handleSettle({ ...t, method:'ton' })}
                            style={{
                              flex:1, height:36, borderRadius:10, border:'1px solid rgba(34,212,122,0.3)',
                              background:'rgba(34,212,122,0.1)',
                              color:'#22d47a', fontSize:13, fontWeight:700, cursor:'pointer',
                            }}
                          >💎 TON</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Individual balances */}
          <div style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 }}>
            Individual Balances
          </div>
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'4px 0' }}>
            {balances.balances.map((b, i) => (
              <div key={b.telegram_id} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'13px 16px',
                borderBottom: i < balances.balances.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{
                    width:34, height:34, borderRadius:11, background:'rgba(255,255,255,0.06)',
                    border:'1px solid rgba(255,255,255,0.08)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:14, fontWeight:800, color:'#7ab4ff',
                  }}>{(b.telegram_id === myId ? 'Me' : b.full_name || '?').charAt(0).toUpperCase()}</div>
                  <span style={{ fontSize:14, fontWeight:600, color:'#c8d0f0' }}>
                    {b.telegram_id === myId ? 'You' : b.full_name}
                  </span>
                </div>
                <span style={{
                  fontSize:15, fontWeight:800,
                  color: b.net > 0 ? '#22d47a' : b.net < 0 ? '#f05252' : '#3d4870',
                }}>
                  {b.net > 0 ? '+' : ''}{b.net.toFixed(2)} {activeGroup.currency}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FAB ── */}
      <button
        className="fab-add"
        onClick={() => onNavigate('add-expense')}
        style={{
          position:'fixed', bottom:90, right:20, zIndex:100,
          width:56, height:56, borderRadius:18,
          background:'linear-gradient(135deg, #4f8ef7, #6a5ef7)',
          border:'none', color:'#fff', fontSize:24, fontWeight:300,
          cursor:'pointer', animation:'fab-pulse 2.5s ease-in-out infinite',
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'transform 0.1s',
        }}
      >＋</button>
    </div>
  );
}
