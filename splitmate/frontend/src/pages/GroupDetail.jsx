import React, { useState } from 'react';
import useAppStore from '../store/appStore.js';
import api from '../utils/api.js';
import { CatIcons, AddExpenseIcon, SettleUpIcon, AnalyticsActive, SettingsIcon } from '../components/Icons.jsx';

// Use SVG icon components for categories
const getCatIcon = (cat) => {
  const Ico = CatIcons[cat] || CatIcons.other;
  return Ico;
};

const CAT_COLORS = {
  food: '#4B5320', transport: '#6B7B3A', accommodation: '#8F974B',
  entertainment: '#DC3545', shopping: '#FFC107', health: '#28A745',
  utilities: '#3A4219', general: '#CCCCCC',
};

function CommentsPanel({ expenseId, initialComments = [], user, onToast }) {
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const { comment } = await api.comments.add({ expenseId, text: text.trim() });
      setComments(prev => [...prev, comment]);
      setText('');
    } catch (err) { onToast(err.message || 'Failed', 'error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    try { await api.comments.delete(id); setComments(prev => prev.filter(c => c.id !== id)); } catch {}
  };

  return (
    <div style={{ borderTop: '1px solid #F5F5F5', padding: '12px 16px 14px', background: '#fafafa' }}>
      {comments.map(c => (
        <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
          <div className="avatar avatar-sm" style={{ background: '#F5F5F5', color: '#333', fontWeight: 700 }}>
            {(c.users?.full_name || '?').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, background: '#fff', borderRadius: 8, padding: '8px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#CCCCCC', marginBottom: 3 }}>{c.users?.full_name || 'Member'}</div>
            <div style={{ fontSize: 13, color: '#333', lineHeight: 1.4 }}>{c.text}</div>
          </div>
          {Number(c.user_id) === Number(user?.id) && (
            <button onClick={() => handleDelete(c.id)} style={{ width: 24, height: 24, borderRadius: 4, border: 'none', background: 'rgba(220,53,69,0.1)', color: '#DC3545', fontSize: 10, cursor: 'pointer', flexShrink: 0, marginTop: 2, fontFamily: 'inherit' }}>✕</button>
          )}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: comments.length ? 4 : 0 }}>
        <input
          type="text" placeholder="Add a note…" value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()} maxLength={500}
          style={{ flex: 1, height: 36, borderRadius: 999, border: '1px solid #CCCCCC', background: '#fff', color: '#333', fontSize: 13, padding: '0 14px', outline: 'none', fontFamily: 'inherit' }}
        />
        <button
          onClick={handleAdd} disabled={loading || !text.trim()}
          style={{ height: 36, padding: '0 14px', borderRadius: 999, border: 'none', background: text.trim() ? '#4B5320' : '#F5F5F5', color: text.trim() ? '#fff' : '#CCCCCC', fontSize: 13, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all 0.15s' }}
        >
          {loading ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}

export default function GroupDetail({ onNavigate, onToast }) {
  const { activeGroup, expenses, balances, user, deleteExpense, paymentStatus, deleteGroup } = useAppStore();
  const isAdmin = activeGroup?.role === 'admin' || activeGroup?.created_by === user?.id?.toString();
  const [openComments, setOpenComments] = useState({});
  const [tab, setTab] = useState('expenses');
  const [myWallets, setMyWallets] = React.useState(null);

  React.useEffect(() => {
    api.wallets.mine().then(r => setMyWallets(r.wallets || [])).catch(() => setMyWallets([]));
  }, []);

  if (!activeGroup) { onNavigate('groups'); return null; }

  const handleBack     = () => onNavigate('groups');
  const toggleComments = (id) => setOpenComments(prev => ({ ...prev, [id]: !prev[id] }));

  const handleDeleteGroup = () => {
    window.Telegram?.WebApp?.showConfirm(`Delete "${activeGroup.name}"?`, async (ok) => {
      if (!ok) return;
      try { await deleteGroup(activeGroup.id); onToast('Group deleted'); onNavigate('groups'); }
      catch (err) { onToast(err.message || 'Failed', 'error'); }
    });
  };

  const handleDelete = async (id) => {
    window.Telegram?.WebApp?.showConfirm('Delete this expense?', async (ok) => {
      if (ok) try { await deleteExpense(id); onToast('Expense deleted'); }
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
      const API   = import.meta.env.VITE_API_URL || 'https://splitmate-production-9382.up.railway.app';
      const token = window.Telegram?.WebApp?.initData || '';
      if (!token) { onToast('Open in Telegram to export', 'error'); return; }
      const resp = await fetch(`${API}/api/expenses/${activeGroup.id}/export`, { headers: { 'x-telegram-init-data': token } });
      if (!resp.ok) throw new Error('Export failed');
      const blob = await resp.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a'); a.href = url;
      a.download = `splitmate-${activeGroup.name.replace(/[^a-z0-9]/gi, '-')}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      onToast('CSV downloaded! 📊');
    } catch (err) { onToast(err.message, 'error'); }
  };

  const handleShare = () => {
    const inv = `https://t.me/SplitMateExpenseBot?start=group_${activeGroup.invite_code}`;
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(inv)}&text=${encodeURIComponent(`Join "${activeGroup.name}" on SplitMate!\n${inv}`)}`);
    } else { navigator.clipboard?.writeText(inv); onToast('Invite link copied! 📋'); }
  };

  const fmt    = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const myId   = user?.id;
  const isPro  = paymentStatus?.isPro;
  const myPaid = expenses.reduce((s, e) => s + (Number(e.paid_by) === Number(myId) ? parseFloat(e.amount) : 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F5', paddingBottom: 100 }}>

      {/* ── Header — spec §2.11 ── */}
      <div className="page-header">
        <button className="btn-icon" onClick={handleBack} style={{ fontSize: 20, background: '#F5F5F5' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 8L8 12L12 16" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 12H8" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="page-header-title">{activeGroup.name}</div>
          <div className="page-header-sub">{activeGroup.member_count} members · {activeGroup.currency}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-icon" onClick={handleShare} style={{ background: '#F5F5F5', color: '#4B5320' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07L9.5 11.07"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07L14.5 12.93"/></svg>
          </button>
          <button className="btn-icon" onClick={() => onNavigate('analytics')} style={{ background: '#F5F5F5', color: '#4B5320' }}>
            <AnalyticsActive />
          </button>
          <button className="btn-icon" onClick={handleExport} style={{ background: '#F5F5F5', color: '#4B5320' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          {isAdmin && <button className="btn-icon" onClick={handleDeleteGroup} style={{ background: 'rgba(220,53,69,0.08)', color: '#DC3545' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>}
        </div>
      </div>

      <div style={{ padding: '24px 24px 0' }}>

        {/* ── Balance Card — spec §3.2 Wallet Balance adapted ── */}
        <div className="card animate-in" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, color: '#CCCCCC', marginBottom: 4 }}>My Contributions</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#333', lineHeight: '40px', marginBottom: 16 }}>
            {activeGroup.currency} {myPaid.toFixed(2)}
          </div>
          <div style={{ display: 'flex', gap: 0, borderTop: '1px solid #F5F5F5', paddingTop: 16 }}>
            <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #F5F5F5' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#333' }}>{expenses.length}</div>
              <div style={{ fontSize: 12, color: '#CCCCCC' }}>Expenses</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#4B5320' }}>{activeGroup.member_count}</div>
              <div style={{ fontSize: 12, color: '#CCCCCC' }}>Members</div>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="tabs" style={{ marginBottom: 16 }}>
          <button className={`tab ${tab === 'expenses' ? 'active' : ''}`} onClick={() => setTab('expenses')}>🧾 Expenses</button>
          <button className={`tab ${tab === 'balances' ? 'active' : ''}`} onClick={() => setTab('balances')}>⚖️ Balances</button>
        </div>

        {/* ── Expenses Tab — spec §2.4 Activity List Item ── */}
        {tab === 'expenses' && (
          expenses.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M4 2V22L7 20L10 22L13 20L16 22L19 20L22 22V2H4Z" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 6H18" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 10H18" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 14H14" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                <div className="empty-title">No expenses yet</div>
                <div className="empty-desc">Tap + to log the first expense</div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {expenses.map((exp, i) => {
                const myShare  = exp.expense_splits?.find(s => Number(s.user_id) === Number(myId));
                const iPaid    = Number(exp.paid_by) === Number(myId);
                const CatIco   = getCatIcon(exp.category);
                const catColor = CAT_COLORS[exp.category] || '#CCCCCC';
                const amt      = parseFloat(exp.amount);
                const commentsOpen  = openComments[exp.id];
                const commentCount  = exp.expense_comments?.length || 0;

                return (
                  <div key={exp.id}>
                    {/* spec §2.4 Activity List Item */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', borderBottom: '1px solid #F5F5F5' }}>

                      {/* Avatar — spec §2.7, circular */}
                      <div className="avatar" style={{ background: catColor + '15', borderRadius: '50%', color: catColor }}>
                        <CatIco />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Primary text — 16px regular #333 */}
                        <div className="list-item-primary" style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {exp.description}
                        </div>
                        {/* Secondary — 12px #CCCCCC */}
                        <div className="list-item-secondary">
                          {exp.users?.full_name || 'Someone'} · {fmt(exp.created_at)}
                          {exp.is_recurring && ' · ↻'}
                        </div>
                      </div>

                      {/* Amount — spec §2.4: #333 negative, #4B5320 positive */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div className={`list-item-amount ${iPaid ? 'positive' : ''}`} style={{ fontWeight: 500 }}>
                          {iPaid ? '+' : '-'}{exp.currency} {amt.toFixed(2)}
                        </div>
                        {myShare && !iPaid && (
                          <div style={{ fontSize: 11, color: myShare.is_settled ? '#4B5320' : '#DC3545', fontWeight: 600 }}>
                            {myShare.is_settled ? 'settled' : `owe ${exp.currency}${parseFloat(myShare.amount_owed).toFixed(2)}`}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button
                          onClick={() => toggleComments(exp.id)}
                          style={{
                            width: 30, height: 30, borderRadius: 6, flexShrink: 0,
                            border: `1px solid ${commentsOpen ? '#4B5320' : '#CCCCCC'}`,
                            background: commentsOpen ? 'rgba(75,83,32,0.08)' : '#F5F5F5',
                            color: commentsOpen ? '#4B5320' : '#CCCCCC',
                            fontSize: 12, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
                          }}
                        >
                          💬{commentCount > 0 && <span style={{ fontSize: 9, fontWeight: 700 }}>{commentCount}</span>}
                        </button>
                        {iPaid && (
                          <button onClick={() => handleDelete(exp.id)} style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid rgba(220,53,69,0.3)', background: 'rgba(220,53,69,0.06)', color: '#DC3545', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                        )}
                      </div>
                    </div>

                    {commentsOpen && (
                      <CommentsPanel expenseId={exp.id} initialComments={exp.expense_comments || []} user={user} onToast={onToast} />
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── Balances Tab ── */}
        {tab === 'balances' && balances && (
          <div>
            {myWallets !== null && !myWallets.find(w => w.chain === 'TON') && (
              <div className="card card-tappable" onClick={() => onNavigate('wallet-settings')} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, padding: '16px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 3L2 9L12 22L22 9L18 3H6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 22V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 9H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 3L9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18 3L15 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>Set up TON wallet</div>
                  <div className="list-item-secondary">Enable instant crypto settlements</div>
                </div>
                <span style={{ color: '#CCCCCC', fontSize: 18 }}>›</span>
              </div>
            )}

            {/* Member Balances — spec §2.4 Category List Item style */}
            {balances.member_balances?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div className="section-title">Members</div>
                <div className="card" style={{ padding: 0 }}>
                  {balances.member_balances.map((mb, i) => {
                    const net = parseFloat(mb.net_balance || 0);
                    return (
                      <div key={i} className="list-item">
                        <div className="avatar" style={{ background: '#F5F5F5', borderRadius: '50%', fontWeight: 700 }}>
                          {(mb.full_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="list-item-primary" style={{ fontWeight: 500 }}>{mb.full_name}</div>
                          <div className="list-item-secondary">paid ${parseFloat(mb.total_paid || 0).toFixed(2)}</div>
                        </div>
                        {Math.abs(net) < 0.01 ? (
                          <span className="badge badge-success">Settled ✓</span>
                        ) : (
                          <div style={{ textAlign: 'right' }}>
                            <div className={`list-item-amount ${net > 0 ? 'positive' : 'negative'}`} style={{ fontWeight: 600 }}>
                              {net > 0 ? '+' : ''}${net.toFixed(2)}
                            </div>
                            <div className="list-item-secondary">{net > 0 ? 'is owed' : 'owes'}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Transactions */}
            {balances.transactions?.length > 0 && (
              <div>
                <div className="section-title">To Settle Up</div>
                {balances.transactions.map((tx, i) => (
                  <div key={i} className="card" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div className="avatar" style={{ borderRadius: '50%', fontWeight: 700 }}>
                      {(tx.from?.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: '#CCCCCC', lineHeight: '20px' }}>
                        <span style={{ fontWeight: 600, color: '#333' }}>{tx.from?.full_name}</span>
                        {' pays '}
                        <span style={{ fontWeight: 600, color: '#333' }}>{tx.to?.full_name}</span>
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#DC3545', lineHeight: '32px', marginTop: 2 }}>
                        {activeGroup.currency} {parseFloat(tx.amount).toFixed(2)}
                      </div>
                    </div>
                    {Number(tx.from?.telegram_id) === Number(myId) && (
                      <button
                        onClick={() => handleSettle(tx)}
                        className="btn-inline"
                        style={{ flexShrink: 0 }}
                      >
                        Settle Up
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {(!balances.transactions || balances.transactions.length === 0) && (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 12L11 15L16 9" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                  <div className="empty-title">All settled up!</div>
                  <div className="empty-desc">No outstanding balances in this group</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <button className="fab" onClick={() => onNavigate('add-expense')} style={{ fontSize: 28, lineHeight: 1 }}>＋</button>
    </div>
  );
}
