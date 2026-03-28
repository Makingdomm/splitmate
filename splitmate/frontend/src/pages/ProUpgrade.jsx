import React, { useState } from 'react';
import useAppStore from '../store/appStore.js';
import api from '../utils/api.js';

const FEATURES = [
  { icon: '👥', text: 'Unlimited expense groups' },
  { icon: '💱', text: 'Multi-currency with live rates' },
  { icon: '🧾', text: 'Receipt photo scanning (AI)' },
  { icon: '⛓️', text: 'Instant TON blockchain settlements' },
  { icon: '🔔', text: 'Automated debt reminders' },
  { icon: '📊', text: 'Spending analytics & charts' },
];

export default function ProUpgrade({ onToast }) {
  const { paymentStatus } = useAppStore();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      await api.post('/payments/invoice');
      onToast('✅ Invoice sent — check your Telegram messages!', 'success');
    } catch (err) {
      onToast('Failed to send invoice. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (paymentStatus?.isPro) {
    return (
      <div className="page" style={{ padding: '0 20px' }}>
        {/* Active Pro banner */}
        <div style={{
          marginTop: 28,
          borderRadius: 20,
          padding: '28px 22px',
          background: 'linear-gradient(135deg, rgba(245,200,66,0.15) 0%, rgba(245,200,66,0.05) 100%)',
          border: '1px solid rgba(245,200,66,0.3)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', width: 160, height: 160, background: 'radial-gradient(circle, rgba(245,200,66,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
          <div style={{ fontSize: 52, marginBottom: 12 }}>⭐</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f5c842', marginBottom: 6 }}>You're Pro!</div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>
            All features unlocked. Enjoy SplitMate to the fullest.
          </div>
          {paymentStatus.expiresAt && (
            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-3)', background: 'rgba(0,0,0,0.2)', padding: '6px 14px', borderRadius: 20, display: 'inline-block' }}>
              Renews {new Date(paymentStatus.expiresAt).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Features grid */}
        <div style={{ marginTop: 24 }}>
          <p className="section-title">Your Pro Features</p>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 20, width: 32, textAlign: 'center' }}>{f.icon}</span>
              <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{f.text}</span>
              <span style={{ marginLeft: 'auto', color: 'var(--green)', fontSize: 16 }}>✓</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: '0 20px 100px' }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '32px 0 24px', position: 'relative' }}>
        {/* Glow blob */}
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 200, height: 200, background: 'radial-gradient(circle, rgba(245,200,66,0.12) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ fontSize: 58, marginBottom: 14, filter: 'drop-shadow(0 0 20px rgba(245,200,66,0.5))' }}>⭐</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5, marginBottom: 8 }}>
          Unlock <span style={{ color: 'var(--gold)' }}>SplitMate Pro</span>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
          Everything you need to split expenses like a pro — no limits, no friction.
        </p>
      </div>

      {/* Pricing card */}
      <div style={{
        borderRadius: 20,
        padding: '22px 20px',
        background: 'linear-gradient(135deg, rgba(79,142,247,0.10) 0%, rgba(106,94,247,0.08) 100%)',
        border: '1px solid rgba(79,142,247,0.25)',
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Top shimmer line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(79,142,247,0.5), transparent)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>Pro Monthly</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 38, fontWeight: 900, color: 'var(--text)', letterSpacing: -2 }}>⭐500</span>
              <span style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 500 }}>Stars / mo</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>≈ $12.50 · Cancel anytime</div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, var(--accent), #6a5ef7)',
            padding: '6px 14px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            color: '#fff',
            boxShadow: '0 4px 14px var(--accent-glow)',
          }}>
            POPULAR
          </div>
        </div>
      </div>

      {/* Features list */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '8px 18px',
        marginBottom: 24,
      }}>
        {FEATURES.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderBottom: i < FEATURES.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{f.icon}</span>
            <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{f.text}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--gold)', fontSize: 15, fontWeight: 700 }}>✦</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        className="btn btn-gold"
        onClick={handleUpgrade}
        disabled={loading}
        style={{ fontSize: 16, fontWeight: 800, letterSpacing: 0.2, height: 56 }}
      >
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#1a1200' }} />
            Sending invoice…
          </span>
        ) : '⭐ Upgrade Now — 500 Stars'}
      </button>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)', marginTop: 12, lineHeight: 1.6 }}>
        Paid securely via Telegram Stars.<br />
        Subscription renews monthly. Cancel anytime.
      </p>
    </div>
  );
}
