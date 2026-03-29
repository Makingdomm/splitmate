import { useState } from 'react';
import useAppStore from '../store/appStore';

export default function ProUpgrade({ onNavigate }) {
  const { paymentStatus, upgradeToProMessage, fetchPaymentStatus } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [msg, setMsg] = useState('');

  const handleUpgrade = async (starsAmount) => {
    setLoading(true);
    setMsg('');
    try {
      await upgradeToProMessage(starsAmount);
      setMsg('✅ Invoice sent! Complete payment in your Telegram chat.');
    } catch (e) {
      setMsg('❌ ' + (e.message || 'Something went wrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await fetchPaymentStatus();
      const updated = useAppStore.getState().paymentStatus;
      if (updated?.isPro) {
        setMsg(`🎉 ${updated.tier === 'elite' ? 'Elite' : 'Standard'} plan activated!`);
      } else {
        setMsg('Payment not found yet. Try again in a moment.');
      }
    } catch (e) {
      setMsg('Failed to verify');
    } finally {
      setVerifying(false);
    }
  };

  if (paymentStatus?.isPro) {
    const isElite = paymentStatus.tier === 'elite';
    const expires = paymentStatus.proExpiresAt
      ? new Date(paymentStatus.proExpiresAt).toLocaleDateString()
      : 'Never';

    return (
      <div style={{ padding: '20px', maxWidth: 420, margin: '0 auto' }}>
        {/* Current Plan Banner */}
        <div style={{
          background: isElite
            ? 'linear-gradient(135deg, #1a0533 0%, #2d0a4e 50%, #1a0533 100%)'
            : 'linear-gradient(135deg, #0a1628 0%, #1a2d4e 50%, #0a1628 100%)',
          borderRadius: 20,
          padding: '28px 24px',
          textAlign: 'center',
          marginBottom: 20,
          border: isElite ? '1px solid rgba(168,85,247,0.4)' : '1px solid rgba(79,142,247,0.3)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{isElite ? '💎' : '⭐'}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: isElite ? '#c084fc' : '#7ab4ff', marginBottom: 4 }}>
            {isElite ? 'Elite Plan' : 'Standard Plan'}
          </div>
          <div style={{ color: '#8899cc', fontSize: 13 }}>Active until {expires}</div>

          <div style={{
            marginTop: 18,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
          }}>
            {[
              '✅ Unlimited groups',
              '✅ Multi-currency',
              '✅ Receipt scanning',
              '✅ TON settlements',
              ...(isElite ? ['✅ Analytics', '✅ Priority support'] : []),
            ].map((f, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 10,
                padding: '8px 10px',
                fontSize: 12,
                color: '#c8d8f0',
                textAlign: 'left',
              }}>{f}</div>
            ))}
          </div>
        </div>

        {/* Upgrade to Elite CTA (if on Standard) */}
        {!isElite && (
          <div style={{
            background: 'linear-gradient(135deg, #1a0533, #2d0a4e)',
            borderRadius: 16,
            padding: '20px 18px',
            border: '1px solid rgba(168,85,247,0.3)',
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#c084fc', marginBottom: 6 }}>
              💎 Upgrade to Elite
            </div>
            <div style={{ fontSize: 13, color: '#8899cc', marginBottom: 14 }}>
              Unlock analytics dashboard, priority support & early features.
            </div>
            <button
              onClick={() => handleUpgrade(paymentStatus?.eliteStarsPrice || 199)}
              disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: 12,
                background: loading ? '#333' : 'linear-gradient(90deg, #9333ea, #7c3aed)',
                color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer',
              }}
            >
              {loading ? 'Sending…' : `Upgrade for ${paymentStatus?.eliteStarsPrice || 199} ⭐`}
            </button>
            {msg && <div style={{ marginTop: 10, color: msg.startsWith('✅') ? '#6ee7b7' : '#f87171', fontSize: 13, textAlign: 'center' }}>{msg}</div>}
          </div>
        )}

        <button
          onClick={() => onNavigate('groups')}
          style={{
            width: '100%', padding: 14, borderRadius: 14,
            background: 'rgba(255,255,255,0.07)', color: '#c8d8f0',
            border: '1px solid rgba(255,255,255,0.1)', fontSize: 15, cursor: 'pointer',
          }}
        >
          ← Back to Groups
        </button>
      </div>
    );
  }

  // Not pro — show upgrade options
  const standardPrice = paymentStatus?.starsPrice || 99;
  const elitePrice = paymentStatus?.eliteStarsPrice || 199;

  return (
    <div style={{ padding: '20px', maxWidth: 420, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>⭐</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#e8f4ff' }}>Upgrade SplitMate</div>
        <div style={{ fontSize: 14, color: '#6677aa', marginTop: 4 }}>Choose your plan</div>
      </div>

      {/* Standard Plan */}
      <div style={{
        background: 'linear-gradient(135deg, #0a1628, #1a2d4e)',
        borderRadius: 18, padding: '20px 18px', marginBottom: 14,
        border: '1px solid rgba(79,142,247,0.35)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#7ab4ff' }}>⭐ Standard</div>
            <div style={{ fontSize: 12, color: '#5566aa' }}>Per month</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#e8f4ff' }}>{standardPrice} ⭐</div>
        </div>
        {[
          'Unlimited groups',
          'Multi-currency support',
          'Receipt photo scanning',
          'TON wallet settlements',
          'Automated debt reminders',
        ].map((f, i) => (
          <div key={i} style={{ fontSize: 13, color: '#8899cc', marginBottom: 5 }}>✓ {f}</div>
        ))}
        <button
          onClick={() => handleUpgrade(standardPrice)}
          disabled={loading}
          style={{
            width: '100%', marginTop: 14, padding: 13, borderRadius: 12,
            background: loading ? '#1a2d4e' : 'linear-gradient(90deg, #2563eb, #1d4ed8)',
            color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer',
          }}
        >
          {loading ? 'Sending…' : `Get Standard — ${standardPrice} ⭐`}
        </button>
      </div>

      {/* Elite Plan */}
      <div style={{
        background: 'linear-gradient(135deg, #1a0533, #2d0a4e)',
        borderRadius: 18, padding: '20px 18px', marginBottom: 20,
        border: '2px solid rgba(168,85,247,0.5)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: '#9333ea', borderRadius: 8, padding: '2px 10px',
          fontSize: 11, fontWeight: 700, color: '#fff',
        }}>BEST VALUE</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#c084fc' }}>💎 Elite</div>
            <div style={{ fontSize: 12, color: '#7c3aed' }}>Per month</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#e8f4ff' }}>{elitePrice} ⭐</div>
        </div>
        {[
          'Everything in Standard',
          'Advanced analytics dashboard',
          'Priority support',
          'Early access to new features',
        ].map((f, i) => (
          <div key={i} style={{ fontSize: 13, color: '#c8a0e8', marginBottom: 5 }}>✓ {f}</div>
        ))}
        <button
          onClick={() => handleUpgrade(elitePrice)}
          disabled={loading}
          style={{
            width: '100%', marginTop: 14, padding: 13, borderRadius: 12,
            background: loading ? '#2d0a4e' : 'linear-gradient(90deg, #9333ea, #7c3aed)',
            color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer',
          }}
        >
          {loading ? 'Sending…' : `Get Elite — ${elitePrice} ⭐`}
        </button>
      </div>

      {msg && (
        <div style={{
          background: msg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${msg.startsWith('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: 12, padding: '12px 16px', marginBottom: 14,
          color: msg.startsWith('✅') ? '#6ee7b7' : '#f87171', fontSize: 14, textAlign: 'center',
        }}>{msg}</div>
      )}

      {msg.includes('Invoice') && (
        <button
          onClick={handleVerify}
          disabled={verifying}
          style={{
            width: '100%', padding: 13, borderRadius: 12,
            background: 'rgba(255,255,255,0.07)', color: '#c8d8f0',
            border: '1px solid rgba(255,255,255,0.15)', fontSize: 14, cursor: 'pointer', marginBottom: 12,
          }}
        >
          {verifying ? 'Checking…' : '🔄 I paid — verify now'}
        </button>
      )}

      <div style={{ textAlign: 'center', fontSize: 12, color: '#4455aa' }}>
        Paid with Telegram Stars · Cancel anytime · No hidden fees
      </div>
    </div>
  );
}
