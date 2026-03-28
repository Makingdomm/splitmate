// =============================================================================
// pages/AddExpense.jsx — Form to add a new shared expense
// =============================================================================

import React, { useState, useEffect } from 'react';
import useAppStore from '../store/appStore.js';
import api from '../utils/api.js';

const CATEGORIES = [
  { value: 'food',          label: '🍕 Food & Drink' },
  { value: 'transport',     label: '🚗 Transport' },
  { value: 'accommodation', label: '🏨 Accommodation' },
  { value: 'entertainment', label: '🎬 Entertainment' },
  { value: 'shopping',      label: '🛍️ Shopping' },
  { value: 'health',        label: '💊 Health' },
  { value: 'utilities',     label: '💡 Utilities' },
  { value: 'general',       label: '💰 General' },
];

export default function AddExpense({ onNavigate, onToast }) {
  const { activeGroup, user, addExpense, paymentStatus } = useAppStore();

  const [members, setMembers]       = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [form, setForm]             = useState({
    description: '',
    amount:      '',
    currency:    activeGroup?.currency || 'USD',
    category:    'general',
    paidBy:      user?.id?.toString() || '',
    splitType:   'equal',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!activeGroup) return;

    // Load group members for the "paid by" selector
    api.groups.get(activeGroup.id).then(({ members }) => setMembers(members));

    // Load supported currencies
    api.payments.currencies().then(({ currencies }) => setCurrencies(currencies));
  }, [activeGroup]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim() || !form.amount) {
      onToast('Please fill in description and amount', 'error');
      return;
    }
    if (isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) {
      onToast('Amount must be a positive number', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await addExpense({
        groupId:     activeGroup.id,
        description: form.description.trim(),
        amount:      parseFloat(form.amount),
        currency:    form.currency,
        category:    form.category,
        splitType:   form.splitType,
        paidBy:      parseInt(form.paidBy, 10),
      });
      onToast('Expense added! 💸');
      onNavigate('group-detail');
    } catch (err) {
      if (err.code === 'PRO_REQUIRED') {
        onNavigate('pro');
      } else {
        onToast(err.message, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!activeGroup) {
    onNavigate('groups');
    return null;
  }

  return (
    <div className="page">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate('group-detail')}>←</button>
        <h1 className="header-title">Add Expense</h1>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        {/* Description */}
        <div className="form-group">
          <label className="form-label">What was it for?</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. Dinner at Mario's, Uber to airport..."
            value={form.description}
            onChange={e => handleChange('description', e.target.value)}
            maxLength={200}
            autoFocus
          />
        </div>

        {/* Amount + Currency */}
        <div className="form-row">
          <div className="form-group flex-2">
            <label className="form-label">Amount</label>
            <input
              className="form-input"
              type="number"
              placeholder="0.00"
              value={form.amount}
              onChange={e => handleChange('amount', e.target.value)}
              min="0.01"
              step="0.01"
              inputMode="decimal"
            />
          </div>
          <div className="form-group flex-1">
            <label className="form-label">Currency</label>
            <select
              className="form-select"
              value={form.currency}
              onChange={e => handleChange('currency', e.target.value)}
              disabled={!paymentStatus?.isPro && form.currency === activeGroup.currency}
            >
              {currencies.map(c => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code}
                </option>
              ))}
            </select>
            {!paymentStatus?.isPro && (
              <span className="pro-hint">⭐ Pro for multi-currency</span>
            )}
          </div>
        </div>

        {/* Category */}
        <div className="form-group">
          <label className="form-label">Category</label>
          <div className="category-grid">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                type="button"
                className={`category-btn ${form.category === cat.value ? 'active' : ''}`}
                onClick={() => handleChange('category', cat.value)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Paid by */}
        <div className="form-group">
          <label className="form-label">Paid by</label>
          <select
            className="form-select"
            value={form.paidBy}
            onChange={e => handleChange('paidBy', e.target.value)}
          >
            {members.map(m => (
              <option key={m.telegram_id} value={m.telegram_id}>
                {m.telegram_id === user?.id ? 'You' : m.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* Split type — Pro feature */}
        <div className="form-group">
          <label className="form-label">
            Split method {!paymentStatus?.isPro && <span className="pro-badge-small">Pro</span>}
          </label>
          <div className="split-options">
            <button
              type="button"
              className={`split-btn ${form.splitType === 'equal' ? 'active' : ''}`}
              onClick={() => handleChange('splitType', 'equal')}
            >
              ÷ Equal
            </button>
            <button
              type="button"
              className={`split-btn ${form.splitType === 'custom' ? 'active' : ''} ${!paymentStatus?.isPro ? 'disabled' : ''}`}
              onClick={() => paymentStatus?.isPro
                ? handleChange('splitType', 'custom')
                : onNavigate('pro')
              }
            >
              # Custom ⭐
            </button>
            <button
              type="button"
              className={`split-btn ${form.splitType === 'percentage' ? 'active' : ''} ${!paymentStatus?.isPro ? 'disabled' : ''}`}
              onClick={() => paymentStatus?.isPro
                ? handleChange('splitType', 'percentage')
                : onNavigate('pro')
              }
            >
              % Percent ⭐
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={submitting}
        >
          {submitting ? 'Adding...' : 'Add Expense 💸'}
        </button>
      </form>
    </div>
  );
}
