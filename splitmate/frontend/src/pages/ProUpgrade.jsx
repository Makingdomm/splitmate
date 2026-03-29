import React, { useState, useEffect, useRef } from 'react';
import useAppStore from '../store/appStore.js';
import api from '../utils/api.js';

const TIERS = [
  {
    key: 'standard',
    name: 'Standard',
    emoji: '💙',
    starsPrice: 500,
    tonPrice: null, // fetched dynamically
    label: 'Most Popular',
    popular: true,
    features: [
      'Unlimited expense groups',
      'Multi-currency support',
      'Custom splits (%, exact)',
      'Automated debt reminders',
    ],
  },
  {
    key: 'elite',
    name: 'Elite',
    emoji: '⭐',
    starsPrice: 1000,
    tonPrice: null,
    label: 'All Features',
    features: [
      'Everything in Standard',
      'AI receipt scanning',
      'TON blockchain settlements',
      'Spending analytics & charts',
      'Priority support',
    ],
  },
];

const PAYMENT_METHODS = [
  { key: 'stars', label: 'Telegram Stars', icon: '⭐', desc: 'Pay with Stars in chat' },
  { key: 'ton',   label: 'TON Crypto',     icon: '💎', desc: 'Pay with TON wallet' },
];

export default function ProUpgrade({ onToast, onNavigate }) {
  const { paymentStatus, user } = useAppStore();
  const [loading, setLoading]     = useState(false);
  const [selected, setSelected]   = useState('standard');
  const [method, setMethod]       = useState('stars');
  const [tonRate, setTonRate]     = useState(null);
  const [step, setStep]           = useState('select'); // 'select' | 'ton_pending' | 'done'
  const [tonLink, setTonLink]     = useState(null);
  const [tonAmount, setTonAmount] = useState(null);
  const [tonComment, setTonComment] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const pollRef = useRef(null);

  const tier = TIERS.find(t => t.key === selected);

  // Fetch TON price on mount
  useEffect(() => {
    api.ton.price()
      .then(d => setTonRate(d?.usd_per_ton || null))
      .catch(() => {});
  }, []);

  // Compute TON prices
  const TON_PRICES = { standard: 2.5, elite: 5.0 }; // USD equivalent in TON
  const tonPriceForTier = TON_PRICES[selected];

  // Clean up polling on unmount
  useEffect(() => () => clearInterval(pollRef.current), []);

  const handleStarsUpgrade = async () => {
    setLoading(true);
    try {
      await api.payments.upgrade(tier.starsPrice);
      setStep('done');
    } catch (err) {
      onToast('Failed to send invoice. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTonUpgrade = async () => {
    setLoading(true);
    try {
      const res = await api.ton.proLink(selected);
      setTonLink(res.link);
      setTonAmount(res.tonAmount);
      setTonComment(res.comment);
      setStep('ton_pending');

      // Open TON wallet deeplink
      if (res.link) {
        window.open(res.link, '_blank');
      }

      // Start polling for payment confirmation
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const verify = await api.ton.verifyPro(null); // backend checks by telegram_id
          if (verify?.isPro) {
            clearInterval(pollRef.current);
            setStep('done');
            onToast('🎉 Pro activated!', 'success');
          }
        } catch {}
        if (attempts >= 40) clearInterval(pollRef.current); // stop after ~2 min
      }, 3000);

    } catch (err) {
      onToast(err?.message || 'Failed to generate payment link.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    if (method === 'stars') handleStarsUpgrade();
    else handleTonUpgrade();
  };

  // ─── Already Pro ───────────────────────────────────────────────────────────
  if (paymentStatus?.isPro) {
    return (
      <Screen>
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <div style={{ fontSize: 72, marginBottom: 20, filter: 'drop-shadow(0 0 24px rgba(245,176,30,0.8))' }}>⭐</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#f5c842', marginBottom: 10 }}>You're Pro!</div>
          <div style={{ fontSize: 15, color: '#8b96c8', lineHeight: 1.7 }}>All features unlocked.</div>
          <div style={{ marginTop: 20, fontSize: 13, color: '#5060a0' }}>
            Expires: {paymentStatus.proExpiresAt
              ? new Date(paymentStatus.proExpiresAt).toLocaleDateString()
              : 'Never'}
          </div>
        </div>
      </Screen>
    );
  }

  // ─── Stars: Invoice Sent ───────────────────────────────────────────────────
  if (step === 'done' && method === 'stars') {
    return (
      <Screen>
        <div style={{ textAlign: 'center', paddingTop: 60 }}>
          <div style={{ fontSize: 72, marginBottom: 20, filter: 'drop-shadow(0 0 24px rgba(245,176,30,0.8))' }}>⭐</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#f5c842', marginBottom: 12 }}>Invoice Sent!</div>
          <div style={{ fontSize: 15, color: '#8b96c8', lineHeight: 1.8, marginBottom: 28 }}>
            Open your chat with<br/>
            <span style={{ color: '#fff', fontWeight: 700 }}>@SplitMateExpenseBot</span><br/>
            to complete the Stars payment.
          </div>
          <AmountBadge icon="⭐" amount={`${tier.starsPrice} Stars`} plan={tier.name} />
          <CloseButton />
        </div>
      </Screen>
    );
  }

  // ─── TON: Done ─────────────────────────────────────────────────────────────
  if (step === 'done' && method === 'ton') {
    return (
      <Screen>
        <div style={{ textAlign: 'center', paddingTop: 60 }}>
          <div style={{ fontSize: 72, marginBottom: 20, filter: 'drop-shadow(0 0 24px rgba(0,120,255,0.8))' }}>💎</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#4fa3ff', marginBottom: 12 }}>Pro Activated!</div>
          <div style={{ fontSize: 15, color: '#8b96c8', lineHeight: 1.8 }}>
            Your TON payment was confirmed.<br/>Enjoy all Pro features!
          </div>
          <CloseButton />
        </div>
      </Screen>
    );
  }

  // ─── TON: Pending ──────────────────────────────────────────────────────────
  if (step === 'ton_pending') {
    return (
      <Screen>
        <div style={{ textAlign: 'center', paddingTop: 48 }}>
          <div style={{ fontSize: 64, marginBottom: 16, animation: 'spin 3s linear infinite' }}>💎</div>
          <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Awaiting Payment</div>
          <div style={{ fontSize: 14, color: '#7a8ab8', lineHeight: 1.7, marginBottom: 24 }}>
            Send exactly <span style={{ color: '#4fa3ff', fontWeight: 700 }}>{tonAmount} TON</span><br/>
            with memo: <span style={{ color: '#f5c842', fontWeight: 700, fontFamily: 'monospace' }}>{tonComment}</span>
          </div>

          {/* Payment details box */}
          <div style={{
            background: 'rgba(79,163,255,0.08)',
            border: '1px solid rgba(79,163,255,0.25)',
            borderRadius: 16, padding: '16px 20px', marginBottom: 20, textAlign: 'left',
          }}>
            <Row label="Amount" value={`${tonAmount} TON`} highlight />
            <Row label="Memo" value={tonComment} mono />
            <Row label="Plan" value={`${tier.name} · 30 days`} />
          </div>

          {/* Re-open wallet button */}
          {tonLink && (
            <button
              onClick={() => window.open(tonLink, '_blank')}
              style={{
                width: '100%', height: 52,
                background: 'linear-gradient(135deg, #0088cc, #0066aa)',
                border: 'none', borderRadius: 16,
                fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer',
                marginBottom: 12,
              }}
            >
              💎 Open TON Wallet
            </button>
          )}

          <div style={{ fontSize: 12, color: '#404870', marginBottom: 20 }}>
            Checking for payment automatically...
            <div style={{ marginTop: 6 }}>
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                background: '#4fa3ff', marginRight: 6,
                animation: 'pulse 1.2s ease-in-out infinite',
              }} />
              <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
              Listening for transaction...
            </div>
          </div>

          <button
            onClick={() => { clearInterval(pollRef.current); setStep('select'); }}
            style={{
              width: '100%', height: 44,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14, fontSize: 14, color: '#5060a0', cursor: 'pointer',
            }}
          >
            ← Back
          </button>
        </div>
      </Screen>
    );
  }

  // ─── Main Select Screen ────────────────────────────────────────────────────
  return (
    <Screen>
      <style>{`
        @keyframes pulse-gold {
          0%,100%{box-shadow:0 0 28px rgba(245,176,30,0.5),0 4px 20px rgba(245,176,30,0.35);}
          50%{box-shadow:0 0 44px rgba(245,176,30,0.75),0 4px 30px rgba(245,176,30,0.55);}
        }
        @keyframes pulse-blue {
          0%,100%{box-shadow:0 0 28px rgba(79,163,255,0.45),0 4px 20px rgba(79,163,255,0.3);}
          50%{box-shadow:0 0 44px rgba(79,163,255,0.7),0 4px 30px rgba(79,163,255,0.5);}
        }
        .cta-btn{transition:transform 0.1s;}
        .cta-btn:active{transform:scale(0.97)!important;}
        .card-tap:active{transform:scale(0.97)!important;}
      `}</style>

      {/* Ambient glows */}
      <div style={{ position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)', width:380, height:380, background:'radial-gradient(circle, rgba(59,110,246,0.16) 0%, transparent 65%)', borderRadius:'50%', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:80, left:'50%', transform:'translateX(-50%)', width:340, height:340, background:'radial-gradient(circle, rgba(245,176,30,0.09) 0%, transparent 65%)', borderRadius:'50%', pointerEvents:'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Back */}
        <div style={{ display:'flex', alignItems:'center', padding:'16px 0 8px' }}>
          <button onClick={() => onNavigate(-1)} style={{ width:36, height:36, borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'#a0b0e0', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
        </div>

        {/* Hero */}
        <div style={{ textAlign:'center', paddingTop:8, paddingBottom:24 }}>
          <h1 style={{ fontSize:28, fontWeight:900, color:'#fff', letterSpacing:-0.5, marginBottom:8 }}>Upgrade to Pro</h1>
          <p style={{ fontSize:14, color:'#7a8ab8', lineHeight:1.6 }}>Unlock all features &amp; split like a pro</p>
        </div>

        {/* Tier tabs */}
        <div style={{ display:'flex', gap:10, marginBottom:20 }}>
          {TIERS.map(t => {
            const isActive = selected === t.key;
            return (
              <div
                key={t.key}
                className="card-tap"
                onClick={() => setSelected(t.key)}
                style={{
                  flex:1, borderRadius:18, padding:'16px 10px',
                  background: isActive
                    ? 'linear-gradient(160deg, rgba(59,110,246,0.28) 0%, rgba(30,50,150,0.22) 100%)'
                    : 'rgba(255,255,255,0.04)',
                  border: isActive ? '1.5px solid rgba(79,142,247,0.65)' : '1px solid rgba(255,255,255,0.08)',
                  textAlign:'center', position:'relative', cursor:'pointer',
                  boxShadow: isActive ? '0 0 28px rgba(79,142,247,0.22), inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
                  transition:'all 0.15s ease',
                }}
              >
                {t.popular && (
                  <div style={{ position:'absolute', top:-11, left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#4f8ef7,#6a5ef7)', fontSize:9, fontWeight:800, color:'#fff', padding:'3px 10px', borderRadius:20, whiteSpace:'nowrap', boxShadow:'0 2px 10px rgba(79,142,247,0.5)', letterSpacing:0.5 }}>POPULAR</div>
                )}
                <div style={{ fontSize:32, marginBottom:6, filter: t.key==='standard' ? 'drop-shadow(0 0 10px rgba(79,142,247,0.8))' : 'drop-shadow(0 0 12px rgba(245,176,30,0.9))' }}>{t.emoji}</div>
                <div style={{ fontSize:12, fontWeight:700, color: isActive ? '#a0b8f0' : '#6070a0', marginBottom:4 }}>{t.name}</div>
                <div style={{ fontSize:18, fontWeight:900, color:'#fff' }}>⭐{t.starsPrice}</div>
                <div style={{ fontSize:10, color:'#5060a0' }}>Stars/mo</div>
                {tonPriceForTier && (
                  <div style={{ fontSize:11, color: isActive ? '#4fa3ff' : '#384870', marginTop:3, fontWeight:600 }}>≈ {selected===t.key ? tonPriceForTier : TON_PRICES[t.key]} TON</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Features */}
        <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:'4px 16px', marginBottom:20 }}>
          {tier.features.map((f, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 0', borderBottom: i < tier.features.length-1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,rgba(79,142,247,0.3),rgba(106,94,247,0.3))', border:'1px solid rgba(79,142,247,0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#7ab4ff', fontWeight:800 }}>✓</div>
              <span style={{ fontSize:14, color:'#c8d0f0', fontWeight:500 }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Payment Method Toggle */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, color:'#5060a0', fontWeight:700, letterSpacing:0.8, textTransform:'uppercase', marginBottom:10 }}>Pay with</div>
          <div style={{ display:'flex', gap:8 }}>
            {PAYMENT_METHODS.map(m => {
              const isActive = method === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setMethod(m.key)}
                  style={{
                    flex:1, height:60, borderRadius:16, cursor:'pointer',
                    background: isActive
                      ? m.key === 'stars'
                        ? 'linear-gradient(135deg, rgba(245,200,30,0.2), rgba(245,176,30,0.12))'
                        : 'linear-gradient(135deg, rgba(0,120,255,0.2), rgba(0,88,200,0.12))'
                      : 'rgba(255,255,255,0.04)',
                    border: isActive
                      ? m.key === 'stars' ? '1.5px solid rgba(245,176,30,0.6)' : '1.5px solid rgba(0,136,204,0.6)'
                      : '1px solid rgba(255,255,255,0.08)',
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2,
                    transition:'all 0.15s',
                  }}
                >
                  <span style={{ fontSize:20 }}>{m.icon}</span>
                  <span style={{ fontSize:11, fontWeight:700, color: isActive ? '#e0d0ff' : '#5060a0' }}>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Method explanation */}
          <div style={{ marginTop:10, padding:'10px 14px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', fontSize:12, color:'#6070a0', lineHeight:1.6 }}>
            {method === 'stars'
              ? `⭐ We'll send a payment invoice to your Telegram chat with @SplitMateExpenseBot. Pay with ${tier.starsPrice} Stars in one tap.`
              : `💎 We'll generate a TON payment link for ${tonPriceForTier} TON. Open your TON wallet and confirm — Pro activates automatically.`
            }
          </div>
        </div>

        {/* CTA Button */}
        <button
          className="cta-btn"
          onClick={handleUpgrade}
          disabled={loading}
          style={{
            width:'100%', height:56, borderRadius:18,
            background: method === 'stars'
              ? 'linear-gradient(135deg, #f5c430, #e8a800)'
              : 'linear-gradient(135deg, #0088cc, #0055aa)',
            border:'none', cursor: loading ? 'not-allowed' : 'pointer',
            fontSize:16, fontWeight:800, color:'#fff',
            animation: method === 'stars' ? 'pulse-gold 2.5s ease-in-out infinite' : 'pulse-blue 2.5s ease-in-out infinite',
            opacity: loading ? 0.7 : 1,
            marginBottom:12,
          }}
        >
          {loading ? '...' : method === 'stars'
            ? `⭐ Pay ${tier.starsPrice} Stars / month`
            : `💎 Pay ${tonPriceForTier} TON / month`
          }
        </button>

        <div style={{ textAlign:'center', fontSize:12, color:'#404870' }}>
          🔒 Secure · Cancel anytime · Instant activation
        </div>
      </div>
    </Screen>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function Screen({ children }) {
  return (
    <div style={{
      minHeight:'100vh',
      background:'linear-gradient(180deg, #060818 0%, #0a0f2e 40%, #060818 100%)',
      padding:'0 16px 120px',
      position:'relative', overflow:'hidden',
    }}>
      {children}
    </div>
  );
}

function AmountBadge({ icon, amount, plan }) {
  return (
    <div style={{
      background:'rgba(245,176,30,0.08)', border:'1px solid rgba(245,176,30,0.2)',
      borderRadius:16, padding:'16px 20px', marginBottom:24,
    }}>
      <div style={{ fontSize:13, color:'#7a6020', marginBottom:8 }}>You will pay</div>
      <div style={{ fontSize:28, fontWeight:900, color:'#f5c842' }}>{icon} {amount}</div>
      <div style={{ fontSize:12, color:'#4a3800', marginTop:4 }}>{plan} plan · 1 month</div>
    </div>
  );
}

function Row({ label, value, highlight, mono }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize:13, color:'#5060a0' }}>{label}</span>
      <span style={{
        fontSize:13, fontWeight:700,
        color: highlight ? '#4fa3ff' : '#c8d0f0',
        fontFamily: mono ? 'monospace' : 'inherit',
        maxWidth:180, textAlign:'right', wordBreak:'break-all',
      }}>{value}</span>
    </div>
  );
}

function CloseButton() {
  return (
    <button
      onClick={() => window.Telegram?.WebApp?.close()}
      style={{
        width:'100%', height:52, marginTop:8,
        background:'rgba(255,255,255,0.06)',
        border:'1px solid rgba(255,255,255,0.10)', borderRadius:16,
        fontSize:15, fontWeight:700, color:'#7a8ab8', cursor:'pointer',
      }}
    >
      Close
    </button>
  );
}
