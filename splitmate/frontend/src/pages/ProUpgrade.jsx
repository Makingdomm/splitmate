// =============================================================================
// pages/ProUpgrade.jsx — Pro subscription upgrade screen
// This is the key monetization touchpoint — make it compelling!
// =============================================================================

import React, { useState } from 'react';
import useAppStore from '../store/appStore.js';

const PRO_FEATURES = [
  { icon: '👥', title: 'Unlimited Groups',        desc: 'Create as many groups as you need' },
  { icon: '💱', title: 'Multi-Currency',           desc: '20+ currencies with live FX rates' },
  { icon: '📸', title: 'Receipt Scanning',         desc: 'Photo → expense in one tap' },
  { icon: '💎', title: 'TON Wallet Settlements',   desc: 'Pay debts with crypto directly' },
  { icon: '🔔', title: 'Smart Reminders',          desc: 'Auto-nudge friends who owe you' },
  { icon: '📊', title: 'Export & History',         desc: 'Full CSV export, unlimited history' },
  { icon: '🔄', title: 'Recurring Bills',          desc: 'Rent, subscriptions — set and forget' },
  { icon: '#',  title: 'Custom Splits',            desc: 'Split by exact amount or percentage' },
];

export default function ProUpgrade({ onNavigate, onToast }) {
  const { paymentStatus, upgradeToProMessage } = useAppStore();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      await upgradeToProMessage();
      // Close the Mini App so user can see the Stars invoice in chat
      setTimeout(() => {
        window.Telegram?.WebApp?.close();
      }, 1500);
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (paymentStatus?.isPro) {
    return (
      <div className="page">
        <div className="header">
          <button className="back-btn" onClick={() => onNavigate('groups')}>←</button>
          <h1 className="header-title">Pro Plan</h1>
        </div>
        <div className="pro-active-screen">
          <div className="pro-star">⭐</div>
          <h2>You're Pro!</h2>
          <p>All features are unlocked. Enjoy SplitMate to the fullest.</p>
          <button className="btn btn-secondary" onClick={() => onNavigate('groups')}>
            Back to Groups
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="header">
        <button className="back-btn" onClick={() => onNavigate('groups')}>←</button>
        <h1 className="header-title">Upgrade to Pro</h1>
      </div>

      {/* Hero */}
      <div className="pro-hero">
        <div className="pro-hero-icon">⭐</div>
        <h2 className="pro-hero-title">SplitMate Pro</h2>
        <div className="pro-price">
          <span className="price-amount">{paymentStatus?.starsPrice || 500}</span>
          <span className="price-unit">Stars / month</span>
        </div>
        <p className="pro-hero-subtitle">
          ~$5/month · Cancel anytime · Instant activation
        </p>
      </div>

      {/* Feature list */}
      <div className="section">
        <div className="features-grid">
          {PRO_FEATURES.map((f, i) => (
            <div key={i} className="feature-item">
              <span className="feature-icon">{f.icon}</span>
              <div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Social proof */}
      <div className="social-proof">
        <p>💬 "Finally a split app that doesn't make me leave Telegram"</p>
      </div>

      {/* CTA */}
      <div className="cta-section">
        <button
          className="btn btn-pro btn-full"
          onClick={handleUpgrade}
          disabled={loading}
        >
          {loading ? 'Sending invoice...' : `⭐ Pay ${paymentStatus?.starsPrice || 500} Stars`}
        </button>
        <p className="cta-hint">
          You'll be charged via Telegram Stars. Payment is processed securely by Telegram.
        </p>
      </div>
    </div>
  );
}
