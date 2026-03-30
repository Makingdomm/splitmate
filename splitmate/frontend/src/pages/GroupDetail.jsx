import React, { useState, useRef } from 'react';
import useAppStore from '../store/appStore.js';
import api from '../utils/api.js';

const CATEGORY_EMOJI = {
  food: '🍕', transport: '🚗', accommodation: '🏨',
  entertainment: '🎬', shopping: '🛍️', health: '💊',
  utilities: '💡', general: '💰',
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
    <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px 14px', background: 'var(--surface-2)' }}>
      {comments.map(c => (
        <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
          <div className="avatar avatar-sm">{(c.users?.full_name || '?').charAt(0).toUpperCase()}</div>
          <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 10, padding: '7px 10px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', marginBottom: 3 }}>{c.users?.full_name || 'Member'}</div>
            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>{c.text}</div>
          </div>
          {Number(c.user_id) === Number(user?.id) && (
            <button onClick={() => handleDelete(c.id)} style={{ width: 24, height: 24, borderRadius: 7, border: 'none', background: 'var(--red-dim)', color: 'var(--red)', fontSize: 10, cursor: 'pointer', flexShrink: 0, marginTop: 2, fontFamily: 'var(--font)' }}>✕</button>
          )}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: comments.length ? 4 : 0 }}>
        <input
          type="text" placeholder="Add a note…" value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()} maxLength={500}
          style={{ flex: 1, height: 38, borderRadius: 100, border: '1.5px solid var(--border-med)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, padding: '0 14px', outline: 'none', fontFamily: 'var(--font)', boxShadow: 'var(--shadow-sm)' }}
        />
        <button
          onClick={handleAdd} disabled={loading || !text.trim()}
          style={{ height: 38, padding: '0 16px', borderRadius: 100, border: 'none', background: text.trim() ? 'var(--brand)' : 'var(--surface-3)', color: text.trim() ? '#fff' : 'var(--text-4)', fontSize: 13, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'default', fontFamily: 'var(--font)', transition: 'all 0.15s' }}
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
  const [myWallets, setMyWallets] = React.useState(null);
  const [openComments, setOpenComments] = useState({});
  const [tab, setTab] = useState('expenses');

  React.useEffect(() => {
    api.wallets.mine().then(r => setMyWallets(r.wallets || [])).catch(() => setMyWallets([]));
  }, []);

  if (!activeGroup) { onNavigate('groups'); return null; }

  const handleBack = () => onNavigate('groups');

  const handleDeleteGroup = () => {
    window.Telegram?.WebApp?.showConfirm(`Delete "${activeGroup.name}"? This can't be undone.`, async (ok) => {
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
      const API = import.meta.env.VITE_API_URL || 'https://splitmate-production-9382.up.railway.app';
      const token = window.Telegram?.WebApp?.initData || '';
      if (!token) { onToast('Open in Telegram to export', 'error'); return; }
      const resp = await fetch(`${API}/api/expenses/${activeGroup.id}/export`, { headers: { 'x-telegram-init-data': token } });
      if (!resp.ok) throw new Error('Export failed');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `splitmate-${activeGroup.name.replace(/[^a-z0-9]/gi, '-')}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      onToast('CSV downloaded! 📊');
    } catch (err) { onToast(err.message, 'error'); }
  };

  const handleShare = () => {
    const inv = `https://t.me/SplitMateExpenseBot?start=group_${activeGroup.invite_code}`;
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(inv)}&text=${encodeURIComponent(`Join "${activeGroup.name}" on SplitMate!\n\n${inv}`)}`);
    } else { navigator.clipboard?.writeText(inv); onToast('Invite link copied! 📋'); }
  };

  const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const myId = user?.id;
  const toggleComments = (id) => setOpenComments(prev => ({ ...prev, [id]: !prev[id] }));

  const totalPaidByMe = expenses.reduce((s, e) => s + (Number(e.paid_by) === Number(myId) ? parseFloat(e.amount) : 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 100 }}>

      {/* ── Header ── */}
      <div className="page-header">
        <button className="btn-icon" onClick={handleBack} style={{ fontSize: 22 }}>‹</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="page-header-title">{activeGroup.name}</div>
          <div className="page-header-sub">{activeGroup.member_count} members · {activeGroup.currency}</div>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <button className="btn-icon accent" onClick={handleShare}>🔗</button>
          <button className="btn-icon" onClick={() => onNavigate('analytics')} style={{ fontSize: 14 }}>📊</button>
          <button className="btn-icon success" onClick={handleExport} style={{ fontSize: 13 }}>📥</button>
          {isAdmin && <button className="btn-icon danger" onClick={handleDeleteGroup} style={{ fontSize: 14 }}>🗑</button>}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* ── Stat Tiles ── */}
        <div className="stat-grid" style={{ marginBottom: 16 }}>
          <div className="stat-tile">
            <div className="stat-value">{expenses.length}</div>
            <div className="stat-label">Expenses</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value" style={{ color: 'var(--brand)', fontSize: 20 }}>
              {activeGroup.currency} {totalPaidByMe.toFixed(0)}
            </div>
            <div className="stat-label">You Paid</div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="tabs" style={{ marginBottom: 16 }}>
          {['expenses', 'balances'].map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'expenses' ? '🧾 Expenses' : '⚖️ Balances'}
            </button>
          ))}
        </div>

        {/* ── Expenses ── */}
        {tab === 'expenses' && (
          expenses.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon">🧾</div>
                <div className="empty-title">No expenses yet</div>
                <div className="empty-desc">Tap + to log the first expense</div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              {expenses.map((exp, i) => {
                const myShare = exp.expense_splits?.find(s => Number(s.user_id) === Number(myId));
                const iPaid = Number(exp.paid_by) === Number(myId);
                const emoji = CATEGORY_EMOJI[exp.category] || '💰';
                const shareLabel = iPaid ? 'you paid'
                  : myShare?.is_settled ? 'settled'
                  : myShare ? `owe $${parseFloat(myShare.amount_owed).toFixed(2)}`
                  : null;
                const shareColor = iPaid ? 'var(--brand)' : myShare?.is_settled ? 'var(--brand)' : 'var(--red)';
                const commentsOpen = openComments[exp.id];
                const commentCount = exp.expense_comments?.length || 0;

                return (
                  <div key={exp.id} style={{ borderBottom: i < expenses.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>

                      {/* Icon */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--brand-light)', border: '1.5px solid var(--brand-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{emoji}</div>
                        {exp.is_recurring && (
                          <div style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, background: 'var(--brand)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff' }}>🔄</div>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {exp.description}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>
                          {exp.users?.full_name || 'Someone'} · {fmt(exp.created_at)}
                        </div>
                      </div>

                      {/* Amount */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>
                          {exp.currency} {parseFloat(exp.amount).toFixed(2)}
                        </div>
                        {shareLabel && (
                          <div style={{ fontSize: 10, fontWeight: 800, color: shareColor }}>{shareLabel}</div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                        <button
                          onClick={() => toggleComments(exp.id)}
                          style={{
                            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                            border: `1.5px solid ${commentsOpen ? 'var(--brand-mid)' : 'var(--border)'}`,
                            background: commentsOpen ? 'var(--brand-light)' : 'var(--surface-2)',
                            color: commentsOpen ? 'var(--brand)' : 'var(--text-3)',
                            fontSize: 13, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
                          }}
                        >
                          💬{commentCount > 0 && <span style={{ fontSize: 9, fontWeight: 800 }}>{commentCount}</span>}
                        </button>
                        {iPaid && (
                          <button onClick={() => handleDelete(exp.id)} className="btn-icon danger" style={{ width: 32, height: 32, borderRadius: 10, fontSize: 11 }}>✕</button>
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

        {/* ── Balances ── */}
        {tab === 'balances' && balances && (
          <div>
            {myWallets !== null && !myWallets.find(w => w.chain === 'TON') && (
              <div
                onClick={() => onNavigate('wallet-settings')}
                className="card card-hover"
                style={{ padding: '14px 16px', marginBottom: 14, background: '#f0f8ff', border: '1.5px solid #c8e0f8', boxShadow: 'none', display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <span style={{ fontSize: 22 }}>💎</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#2a70b8', marginBottom: 1 }}>Set up TON wallet</div>
                  <div style={{ fontSize: 12, color: '#5a90c8' }}>Enable instant crypto settlements</div>
                </div>
                <span style={{ color: 'var(--text-4)', fontSize: 18 }}>›</span>
              </div>
            )}

            {/* Member balances */}
            {balances.member_balances?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div className="section-label">Members</div>
                <div className="card" style={{ overflow: 'hidden' }}>
                  {balances.member_balances.map((mb, i) => {
                    const net = parseFloat(mb.net_balance || 0);
                    return (
                      <div key={i} className="list-item" style={{ cursor: 'default' }}>
                        <div className="avatar">{(mb.full_name || '?').charAt(0).toUpperCase()}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{mb.full_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                            paid ${parseFloat(mb.total_paid || 0).toFixed(2)}
                          </div>
                        </div>
                        {Math.abs(net) < 0.01 ? (
                          <span className="badge badge-green">Settled ✓</span>
                        ) : (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 15, fontWeight: 900, color: net > 0 ? 'var(--brand)' : 'var(--red)' }}>
                              {net > 0 ? '+' : ''}${net.toFixed(2)}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>
                              {net > 0 ? 'is owed' : 'owes'}
                            </div>
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
                <div className="section-label">To Settle Up</div>
                {balances.transactions.map((tx, i) => (
                  <div key={i} className="card" style={{ padding: '16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="avatar">{(tx.from?.full_name || '?').charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{tx.from?.full_name}</span>
                        <span style={{ color: 'var(--text-3)' }}> pays </span>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{tx.to?.full_name}</span>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--red)', marginTop: 2, letterSpacing: -0.5 }}>
                        {activeGroup.currency} {parseFloat(tx.amount).toFixed(2)}
                      </div>
                    </div>
                    {Number(tx.from?.telegram_id) === Number(myId) && (
                      <button
                        onClick={() => handleSettle(tx)}
                        className="btn-secondary"
                      >
                        Settle →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {(!balances.transactions || balances.transactions.length === 0) && (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-icon">🎉</div>
                  <div className="empty-title">All settled up!</div>
                  <div className="empty-desc">No outstanding balances in this group</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => onNavigate('add-expense')}>＋</button>
    </div>
  );
}
