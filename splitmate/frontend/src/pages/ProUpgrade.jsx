import React, { useState } from 'react';
import useAppStore from '../store/appStore.js';
import api from '../utils/api.js';

const FEATURES = [
  { text: 'Unlimited expense groups' },
  { text: 'Multi-currency with live rates' },
  { text: 'Receipt photo scanning (AI)' },
  { text: 'Instant TON blockchain settlements' },
  { text: 'Automated debt reminders' },
  { text: 'Spending analytics & charts' },
];

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #060818 0%, #0a0f2e 40%, #060818 100%)',
    padding: '0 0 100px',
    position: 'relative',
    overflow: 'hidden',
  },
  // Ambient glows
  glowBlue: {
    position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
    width: 400, height: 400,
    background: 'radial-gradient(circle, rgba(59,110,246,0.18) 0%, transparent 65%)',
    borderRadius: '50%', pointerEvents: 'none',
  },
  glowGold: {
    position: 'absolute', bottom: 120, left: '50%', transform: 'translateX(-50%)',
    width: 350, height: 350,
    background: 'radial-gradient(circle, rgba(245,176,30,0.10) 0%, transparent 65%)',
    borderRadius: '50%', pointerEvents: 'none',
  },
  inner: { position: 'relative', zIndex: 1, padding: '0 18px' },

  // Hero
  hero: { textAlign: 'center', paddingTop: 36, paddingBottom: 28 },
  heroTitle: {
    fontSize: 28, fontWeight: 900, color: '#ffffff',
    letterSpacing: -0.5, marginBottom: 8, lineHeight: 1.2,
  },
  heroSub: { fontSize: 14, color: '#7a8ab8', lineHeight: 1.6 },

  // Star tiers row
  tiersRow: {
    display: 'flex', gap: 10, marginBottom: 24, alignItems: 'stretch',
  },
  tierCard: (active) => ({
    flex: 1, borderRadius: 18, padding: '16px 10px',
    background: active
      ? 'linear-gradient(160deg, rgba(59,110,246,0.25) 0%, rgba(30,50,150,0.20) 100%)'
      : 'rgba(255,255,255,0.04)',
    border: active ? '1.5px solid rgba(79,142,247,0.6)' : '1px solid rgba(255,255,255,0.08)',
    textAlign: 'center', position: 'relative',
    boxShadow: active ? '0 0 30px rgba(79,142,247,0.20), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
    cursor: 'pointer', transition: 'all 0.2s',
  }),
  popularBadge: {
    position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
    background: 'linear-gradient(135deg, #4f8ef7, #6a5ef7)',
    fontSize: 9, fontWeight: 800, color: '#fff',
    padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap',
    boxShadow: '0 2px 10px rgba(79,142,247,0.5)',
    letterSpacing: 0.5,
  },
  tierStar: (type) => ({
    fontSize: 36, marginBottom: 6, display: 'block',
    filter: type === 'basic'
      ? 'drop-shadow(0 0 8px rgba(180,180,200,0.5))'
      : type === 'standard'
        ? 'drop-shadow(0 0 12px rgba(79,142,247,0.8))'
        : 'drop-shadow(0 0 12px rgba(245,176,30,0.9))',
  }),
  tierName: { fontSize: 12, fontWeight: 700, color: '#8b96c8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  tierPrice: { fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: -0.5 },
  tierUnit: { fontSize: 11, color: '#6070a0', fontWeight: 500 },
  tierLabel: (active) => ({ fontSize: 11, color: active ? '#7ab4ff' : '#4a5080', marginTop: 6, fontWeight: 500 }),

  // Features
  featuresBox: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 18, padding: '6px 16px', marginBottom: 24,
  },
  featureRow: (last) => ({
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '13px 0',
    borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.05)',
  }),
  featureCheck: {
    width: 22, height: 22, borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(79,142,247,0.3), rgba(106,94,247,0.3))',
    border: '1px solid rgba(79,142,247,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, fontSize: 12, color: '#7ab4ff', fontWeight: 800,
  },
  featureText: { fontSize: 14, color: '#c8d0f0', fontWeight: 500 },

  // CTA
  ctaBtn: {
    width: '100%', height: 58,
    background: 'linear-gradient(135deg, #d4930a 0%, #f5b820 40%, #ffd060 70%, #f5b820 100%)',
    border: 'none', borderRadius: 30,
    fontSize: 17, fontWeight: 900, color: '#1a0a00',
    cursor: 'pointer', letterSpacing: 0.3,
    boxShadow: '0 0 30px rgba(245,176,30,0.55), 0 4px 20px rgba(245,176,30,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
    position: 'relative', overflow: 'hidden',
    transition: 'transform 0.1s, box-shadow 0.2s',
  },
  ctaBtnShine: {
    position: 'absolute', top: 0, left: '-100%', width: '60%', height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
    transform: 'skewX(-20deg)',
    animation: 'shine 3s infinite',
  },
  note: { textAlign: 'center', fontSize: 12, color: '#3d4870', marginTop: 14, lineHeight: 1.6 },
};

const TIERS = [
  { key: 'basic',    name: 'Basic',    star: '🪨', price: '100', unit: 'Stars/mo', label: 'Free features' },
  { key: 'standard', name: 'Standard', star: '🔵', price: '500', unit: 'Stars/mo', label: 'Popular Choice', active: true },
  { key: 'elite',    name: 'Elite',    star: '⭐', price: '1000', unit: 'Stars/mo', label: 'All Features' },
];

export default function ProUpgrade({ onToast }) {
  const { paymentStatus } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState('standard');

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      await api.payments.upgrade();
      onToast('✅ Invoice sent — check your Telegram messages!', 'success');
    } catch (err) {
      onToast('Failed to send invoice. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (paymentStatus?.isPro) {
    return (
      <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={styles.glowGold} />
        <div style={{ textAlign: 'center', padding: '0 32px' }}>
          <div style={{ fontSize: 72, marginBottom: 16, filter: 'drop-shadow(0 0 20px rgba(245,176,30,0.8))' }}>⭐</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#f5c842', marginBottom: 10 }}>You're Pro!</div>
          <div style={{ fontSize: 15, color: '#8b96c8', lineHeight: 1.7 }}>All features unlocked. Enjoy SplitMate to the fullest.</div>
        </div>
      </div>
    );
  }

  const selectedTier = TIERS.find(t => t.key === selected);

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes shine {
          0% { left: -100%; }
          30% { left: 130%; }
          100% { left: 130%; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 30px rgba(245,176,30,0.55), 0 4px 20px rgba(245,176,30,0.4); }
          50% { box-shadow: 0 0 45px rgba(245,176,30,0.75), 0 4px 30px rgba(245,176,30,0.6); }
        }
        .cta-btn { animation: pulse-glow 2.5s ease-in-out infinite; }
        .cta-btn:active { transform: scale(0.97); }
        .tier-card:active { transform: scale(0.97); }
      `}</style>

      <div style={styles.glowBlue} />
      <div style={styles.glowGold} />

      <div style={styles.inner}>
        {/* Hero */}
        <div style={styles.hero}>
          <h1 style={styles.heroTitle}>Upgrade to Premium</h1>
          <p style={styles.heroSub}>Unlock exclusive benefits & split like a pro</p>
        </div>

        {/* Tier cards */}
        <div style={styles.tiersRow}>
          {TIERS.map(tier => (
            <div
              key={tier.key}
              className="tier-card"
              style={styles.tierCard(selected === tier.key)}
              onClick={() => setSelected(tier.key)}
            >
              {tier.active && <div style={styles.popularBadge}>POPULAR</div>}
              <span style={styles.tierStar(tier.key)}>
                {tier.key === 'basic' ? '🩶' : tier.key === 'standard' ? '💙' : '⭐'}
              </span>
              <div style={styles.tierName}>{tier.name}</div>
              <div style={styles.tierPrice}>⭐{tier.price}</div>
              <div style={styles.tierUnit}>{tier.unit}</div>
              <div style={styles.tierLabel(selected === tier.key)}>{tier.label}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div style={styles.featuresBox}>
          {FEATURES.map((f, i) => (
            <div key={i} style={styles.featureRow(i === FEATURES.length - 1)}>
              <div style={styles.featureCheck}>✓</div>
              <span style={styles.featureText}>{f.text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          className="cta-btn"
          style={styles.ctaBtn}
          onClick={handleUpgrade}
          disabled={loading}
        >
          <div style={styles.ctaBtnShine} />
          {loading ? '⏳ Sending invoice…' : `⭐ Upgrade Now — ${selectedTier.price} Stars`}
        </button>

        <p style={styles.note}>
          Paid securely via Telegram Stars · Cancel anytime
        </p>
      </div>
    </div>
  );
}
