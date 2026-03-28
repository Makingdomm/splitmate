// =============================================================================
// pages/GroupDetail.jsx — Group expenses, balances, and debt summary
// =============================================================================

import React, { useState } from 'react';
import useAppStore from '../store/appStore.js';

const CATEGORY_EMOJI = {
  food: '🍕', transport: '🚗', accommodation: '🏨',
  entertainment: '🎬', shopping: '🛍️', health: '💊',
  utilities: '💡', general: '💰',
};

export default function GroupDetail({ onNavigate, onToast }) {
  const { activeGroup, expenses, balances, user, deleteExpense, paymentStatus } = useAppStore();
  const [tab, setTab] = useState('expenses'); // 'expenses' | 'balances'

  if (!activeGroup) {
    onNavigate('groups');
    return null;
  }

  const handleBack = () => onNavigate('groups');

  const handleDelete = async (expenseId) => {
    window.Telegram?.WebApp?.showConfirm(
      'Delete this expense? This cannot be undone.',
      async (confirmed) => {
        if (confirmed) {
          try {
            await deleteExpense(expenseId);
            onToast('Expense deleted');
          } catch (err) {
            onToast(err.message, 'error');
          }
        }
      }
    );
  };

  const handleSettle = (transaction) => {
    useAppStore.setState({ pendingSettlement: transaction });
    onNavigate('settle');
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const myTelegramId = user?.id;

  return (
    <div className="page">
      {/* Header */}
      <div className="header">
        <button className="back-btn" onClick={handleBack}>←</button>
        <div>
          <h1 className="header-title">{activeGroup.name}</h1>
          <p className="header-subtitle">{activeGroup.member_count} members · {activeGroup.currency}</p>
        </div>
        <button
          className="icon-btn"
          onClick={() => {
            const inviteUrl = `https://t.me/SplitMateBot?start=group_${activeGroup.invite_code}`;
            window.Telegram?.WebApp?.openTelegramLink(inviteUrl);
          }}
          title="Invite"
        >
          👤+
        </button>
      </div>

      {/* Tab switcher */}
      <div className="tab-bar">
        <button
          className={`tab ${tab === 'expenses' ? 'active' : ''}`}
          onClick={() => setTab('expenses')}
        >
          Expenses
        </button>
        <button
          className={`tab ${tab === 'balances' ? 'active' : ''}`}
          onClick={() => setTab('balances')}
        >
          Balances
        </button>
      </div>

      {/* Expenses tab */}
      {tab === 'expenses' && (
        <div className="section">
          {expenses.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🧾</span>
              <h3>No expenses yet</h3>
              <p>Add the first expense to get started</p>
            </div>
          ) : (
            expenses.map(expense => {
              const myShare = expense.splits?.find(s => s.user_id === myTelegramId);
              const iOwePaid = expense.paid_by === myTelegramId;
              const emoji = CATEGORY_EMOJI[expense.category] || '💰';

              return (
                <div key={expense.id} className="expense-card">
                  <div className="expense-left">
                    <span className="expense-emoji">{emoji}</span>
                    <div>
                      <div className="expense-desc">{expense.description}</div>
                      <div className="expense-meta">
                        {expense.paid_by_name} · {formatDate(expense.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="expense-right">
                    <div className="expense-total">
                      {expense.currency} {parseFloat(expense.amount).toFixed(2)}
                    </div>
                    {myShare && (
                      <div className={`expense-share ${iOwePaid ? 'you-paid' : myShare.is_settled ? 'settled' : 'you-owe'}`}>
                        {iOwePaid
                          ? `you paid`
                          : myShare.is_settled
                          ? `settled`
                          : `you owe ${parseFloat(myShare.amount_owed).toFixed(2)}`}
                      </div>
                    )}
                  </div>
                  {/* Delete button — only for expense owner */}
                  {expense.paid_by === myTelegramId && (
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(expense.id)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Balances tab */}
      {tab === 'balances' && balances && (
        <div className="section">
          <h3 className="section-title">Who owes who</h3>
          {balances.transactions.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🎉</span>
              <h3>All settled up!</h3>
              <p>No outstanding debts in this group</p>
            </div>
          ) : (
            balances.transactions.map((t, i) => (
              <div key={i} className="transaction-card">
                <div className="transaction-text">
                  <strong>{t.from.telegram_id === myTelegramId ? 'You' : t.from.full_name}</strong>
                  <span> owe </span>
                  <strong>{t.to.telegram_id === myTelegramId ? 'you' : t.to.full_name}</strong>
                  <span> </span>
                  <strong className="amount">{activeGroup.currency} {t.amount.toFixed(2)}</strong>
                </div>
                {/* Show settle button if it involves the current user */}
                {t.from.telegram_id === myTelegramId && (
                  <div className="settle-actions">
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => handleSettle(t)}
                    >
                      Settle Up
                    </button>
                    {paymentStatus?.isPro && t.to.ton_wallet && (
                      <button
                        className="btn btn-small btn-ton"
                        onClick={() => handleSettle({ ...t, method: 'ton' })}
                      >
                        💎 TON
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {/* Individual balances */}
          <h3 className="section-title" style={{ marginTop: '16px' }}>Individual balances</h3>
          {balances.balances.map(b => (
            <div key={b.telegram_id} className="balance-row">
              <span className="balance-name">
                {b.telegram_id === myTelegramId ? 'You' : b.full_name}
              </span>
              <span className={`balance-net ${b.net > 0 ? 'positive' : b.net < 0 ? 'negative' : 'zero'}`}>
                {b.net > 0 ? '+' : ''}{b.net.toFixed(2)} {activeGroup.currency}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add expense FAB */}
      <button
        className="fab"
        onClick={() => onNavigate('add-expense')}
      >
        + Add Expense
      </button>
    </div>
  );
}
