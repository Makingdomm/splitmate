// =============================================================================
// pages/CreateGroup.jsx — Create a new expense group
// =============================================================================

import React, { useState } from 'react';
import useAppStore from '../store/appStore.js';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'RUB', 'UAH', 'TRY', 'AED', 'IDR'];

export default function CreateGroup({ onNavigate, onToast }) {
  const { createGroup, paymentStatus, groups } = useAppStore();
  const [form, setForm]       = useState({ name: '', description: '', currency: 'USD' });
  const [submitting, setSubmitting] = useState(false);

  const isAtFreeLimit = !paymentStatus?.isPro && groups.length >= 3;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      onToast('Group name is required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const group = await createGroup(form);
      onToast(`Group "${group.name}" created! 🎉`);
      onNavigate('group-detail');
    } catch (err) {
      if (err.code === 'FREE_LIMIT_REACHED') {
        onNavigate('pro');
      } else {
        onToast(err.message, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isAtFreeLimit) {
    return (
      <div className="page">
        <div className="header">
          <button className="back-btn" onClick={() => onNavigate('groups')}>←</button>
          <h1 className="header-title">Create Group</h1>
        </div>
        <div className="limit-screen">
          <div className="limit-icon">🔒</div>
          <h2>Free plan limit reached</h2>
          <p>You've used all 3 free groups. Upgrade to Pro for unlimited groups.</p>
          <button className="btn btn-pro" onClick={() => onNavigate('pro')}>
            ⭐ Upgrade to Pro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate('groups')}>←</button>
        <h1 className="header-title">New Group</h1>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Group name *</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. Bali Trip, Flat Expenses, Boys Weekend"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            maxLength={50}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Description (optional)</label>
          <input
            className="form-input"
            type="text"
            placeholder="What's this group for?"
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            maxLength={200}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Default currency</label>
          <select
            className="form-select"
            value={form.currency}
            onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
          >
            {CURRENCIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={submitting}
        >
          {submitting ? 'Creating...' : 'Create Group 🎉'}
        </button>
      </form>

      {!paymentStatus?.isPro && (
        <p className="form-hint">
          Free plan: {groups.length}/3 groups used.
          <span className="link" onClick={() => onNavigate('pro')}> Upgrade for unlimited →</span>
        </p>
      )}
    </div>
  );
}
