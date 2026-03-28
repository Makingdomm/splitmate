// =============================================================================
// pages/SettleUp.jsx — Settle a debt (manual or TON)
// =============================================================================

import React, { useState } from 'react';
import useAppStore from '../store/appStore.js';

export default function SettleUp({ onNavigate, onToast }) {
  const { activeGroup, settleDebt, paymentStatus } = useAppStore();
  const pendingSettlement = useAppStore(s => s.pendingSettlement);
  const [method, setMethod]     = useState('manual');
  const [submitting, setSubmitting] = useState(false);

  if (!pendingSettlement || !activeGroup) {
    onNavigate('group-detail');
    return null;
  }

  const { from, to, amount } = pendingSettlement;

  const handleSettle = async () => {
    setSubmitting(true);
    try {
      // For TON settlements, TonConnect handles the actual transaction
      // and returns a tx hash. For MVP, we simulate this.
      let txHash = null;
      if (method === 'ton') {
        // In production: integrate @tonconnect/ui-react here
        // txHash = await sendTonTransaction(to.ton_wallet, amount);
        onToast('TON payment integration — connect wallet first', 'error');
        setSubmitting(false);
        return;
      }

      await settleDebt({
        groupId:  activeGroup.id,
        toUserId: to.telegram_id,
        amount,
        currency: activeGroup.currency,
        method,
        txHash,
      });

      onToast(`Settled ${amount.toFixed(2)} ${activeGroup.currency} with ${to.full_name} ✅`);
      onNavigate('group-detail');
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate('group-detail')}>←</button>
        <h1 className="header-title">Settle Up</h1>
      </div>

      <div className="settle-card">
        <div className="settle-summary">
          <div className="settle-amount">
            {activeGroup.currency} {amount.toFixed(2)}
          </div>
          <div className="settle-parties">
            <span className="settle-from">You</span>
            <span className="settle-arrow">→</span>
            <span className="settle-to">{to.full_name}</span>
          </div>
        </div>
      </div>

      {/* Settlement method */}
      <div className="section">
        <h3 className="section-title">Payment method</h3>
        <div className="method-options">
          <button
            className={`method-btn ${method === 'manual' ? 'active' : ''}`}
            onClick={() => setMethod('manual')}
          >
            <span className="method-icon">✓</span>
            <div>
              <div className="method-title">Mark as paid</div>
              <div className="method-desc">Record that you paid outside the app</div>
            </div>
          </button>

          <button
            className={`method-btn ${method === 'ton' ? 'active' : ''} ${!paymentStatus?.isPro ? 'locked' : ''}`}
            onClick={() => paymentStatus?.isPro ? setMethod('ton') : onNavigate('pro')}
          >
            <span className="method-icon">💎</span>
            <div>
              <div className="method-title">Pay via TON {!paymentStatus?.isPro && '⭐'}</div>
              <div className="method-desc">
                {paymentStatus?.isPro
                  ? `Send ${amount.toFixed(2)} ${activeGroup.currency} in TON directly`
                  : 'Pro feature — upgrade to unlock'}
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="cta-section">
        <button
          className={`btn btn-full ${method === 'ton' ? 'btn-ton' : 'btn-primary'}`}
          onClick={handleSettle}
          disabled={submitting}
        >
          {submitting
            ? 'Processing...'
            : method === 'ton'
            ? '💎 Send TON Payment'
            : '✓ Mark as Settled'}
        </button>
      </div>
    </div>
  );
}
