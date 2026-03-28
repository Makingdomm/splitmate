import React, { useState } from 'react';
import useAppStore from '../store/appStore.js';
import api from '../utils/api.js';

const TIERS = [
  {
    key: 'basic',
    name: 'Basic',
    emoji: '🩶',
    price: 100,
    label: 'Free features',
    features: ['Up to 3 expense groups', 'Basic expense tracking', 'Equal splits only'],
  },
  {
    key: 'standard',
    name: 'Standard',
    emoji: '💙',
    price: 500,
    label: 'Popular Choice',
    popular: true,
    features: ['Unlimited expense groups', 'Multi-currency support', 'Custom splits', 'Automated reminders'],
  },
  {
    key: 'elite',
    name: 'Elite',
    emoji: '⭐',
    price: 1000,
    label: 'All Features',
    features: ['Everything in Standard', 'Receipt photo scanning (AI)', 'TON blockchain settlements', 'Spending analytics & charts', 'Priority support'],
  },
];

export default function ProUpgrade({ onToast }) {
  const { paymentStatus } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState('standard');

  const tier = TIERS.find(t => t.key === selected);

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
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #060818 0%, #0a0f2e 50%, #060818 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 32px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 72, marginBottom: 16, filter: 'drop-shadow(0 0 20px rgba(245,176,30,0.8))' }}>⭐</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#f5c842', marginBottom: 10 }}>You're Pro!</div>
          <div style={{ fontSize: 15, color: '#8b96c8', lineHeight: 1.7 }}>All features unlocked.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #060818 0%, #0a0f2e 40%, #060818 100%)',
      padding: '0 16px 120px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* CSS animations */}
      <style>{`
        @keyframes pulse-gold {
          0%, 100% { box-shadow: 0 0 28px rgba(245,176,30,0.5), 0 4px 20px rgba(245,176,30,0.35); }
          50%       { box-shadow: 0 0 44px rgba(245,176,30,0.75), 0 4px 30px rgba(245,176,30,0.55); }
        }
        @keyframes shine {
          0%   { left: -100%; }
          28%  { left: 130%; }
          100% { left: 130%; }
        }
        .gold-btn { animation: pulse-gold 2.5s ease-in-out infinite; }
        .gold-btn:active { transform: scale(0.97) !important; }
        .tier-tap:active { transform: scale(0.96) !important; }
      `}</style>

      {/* Ambient glows */}
      <div style={{ position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)', width:380, height:380, background:'radial-gradient(circle, rgba(59,110,246,0.16) 0%, transparent 65%)', borderRadius:'50%', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:80, left:'50%', transform:'translateX(-50%)', width:340, height:340, background:'radial-gradient(circle, rgba(245,176,30,0.09) 0%, transparent 65%)', borderRadius:'50%', pointerEvents:'none' }} />

      <div style={{ position:'relative', zIndex:1 }}>
        {/* Hero */}
        <div style={{ textAlign:'center', paddingTop:36, paddingBottom:28 }}>
          <h1 style={{ fontSize:28, fontWeight:900, color:'#fff', letterSpacing:-0.5, marginBottom:8 }}>
            Upgrade to Premium
          </h1>
          <p style={{ fontSize:14, color:'#7a8ab8', lineHeight:1.6 }}>
            Unlock exclusive benefits &amp; split like a pro
          </p>
        </div>

        {/* Tier cards */}
        <div style={{ display:'flex', gap:10, marginBottom:24 }}>
          {TIERS.map(t => {
            const isActive = selected === t.key;
            return (
              <div
                key={t.key}
                className="tier-tap"
                onClick={() => setSelected(t.key)}
                style={{
                  flex:1, borderRadius:18, padding:'16px 8px',
                  background: isActive
                    ? 'linear-gradient(160deg, rgba(59,110,246,0.28) 0%, rgba(30,50,150,0.22) 100%)'
                    : 'rgba(255,255,255,0.04)',
                  border: isActive
                    ? '1.5px solid rgba(79,142,247,0.65)'
                    : '1px solid rgba(255,255,255,0.08)',
                  textAlign:'center', position:'relative', cursor:'pointer',
                  boxShadow: isActive ? '0 0 28px rgba(79,142,247,0.22), inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
                  transition:'all 0.15s ease',
                }}
              >
                {t.popular && (
                  <div style={{
                    position:'absolute', top:-11, left:'50%', transform:'translateX(-50%)',
                    background:'linear-gradient(135deg,#4f8ef7,#6a5ef7)',
                    fontSize:9, fontWeight:800, color:'#fff',
                    padding:'3px 10px', borderRadius:20, whiteSpace:'nowrap',
                    boxShadow:'0 2px 10px rgba(79,142,247,0.5)', letterSpacing:0.5,
                  }}>POPULAR</div>
                )}
                <div style={{
                  fontSize:34, marginBottom:6,
                  filter: t.key==='basic' ? 'drop-shadow(0 0 6px rgba(180,180,210,0.4))'
                        : t.key==='standard' ? 'drop-shadow(0 0 10px rgba(79,142,247,0.8))'
                        : 'drop-shadow(0 0 12px rgba(245,176,30,0.9))',
                }}>{t.emoji}</div>
                <div style={{ fontSize:11, fontWeight:700, color: isActive ? '#a0b8f0' : '#6070a0', textTransform:'uppercase', letterSpacing:0.8, marginBottom:6 }}>{t.name}</div>
                <div style={{ fontSize:20, fontWeight:900, color:'#fff', letterSpacing:-0.5 }}>⭐{t.price}</div>
                <div style={{ fontSize:10, color:'#5060a0', marginBottom:6 }}>Stars/mo</div>
                <div style={{ fontSize:11, color: isActive ? '#7ab4ff' : '#404870', fontWeight:500 }}>{t.label}</div>
              </div>
            );
          })}
        </div>

        {/* Features for selected tier */}
        <div style={{
          background:'rgba(255,255,255,0.03)',
          border:'1px solid rgba(255,255,255,0.07)',
          borderRadius:18, padding:'6px 16px', marginBottom:24,
          transition:'all 0.2s',
        }}>
          {tier.features.map((f, i) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:12, padding:'12px 0',
              borderBottom: i < tier.features.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              <div style={{
                width:22, height:22, borderRadius:'50%', flexShrink:0,
                background:'linear-gradient(135deg, rgba(79,142,247,0.3), rgba(106,94,247,0.3))',
                border:'1px solid rgba(79,142,247,0.4)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:12, color:'#7ab4ff', fontWeight:800,
              }}>✓</div>
              <span style={{ fontSize:14, color:'#c8d0f0', fontWeight:500 }}>{f}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          className="gold-btn"
          onClick={handleUpgrade}
          disabled={loading}
          style={{
            width:'100%', height:58,
            background:'linear-gradient(135deg, #c4830a 0%, #f5b820 40%, #ffd060 70%, #f5b820 100%)',
            border:'none', borderRadius:30,
            fontSize:17, fontWeight:900, color:'#1a0a00',
            cursor:'pointer', letterSpacing:0.3,
            position:'relative', overflow:'hidden',
            transition:'transform 0.1s',
          }}
        >
          <div style={{
            position:'absolute', top:0, left:'-100%', width:'60%', height:'100%',
            background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
            transform:'skewX(-20deg)', animation:'shine 3s infinite',
          }} />
          {loading ? '⏳ Sending invoice…' : `⭐ Upgrade Now — ${tier.price} Stars`}
        </button>

        <p style={{ textAlign:'center', fontSize:12, color:'#3d4870', marginTop:12, lineHeight:1.6 }}>
          Paid securely via Telegram Stars · Cancel anytime
        </p>
      </div>
    </div>
  );
}
