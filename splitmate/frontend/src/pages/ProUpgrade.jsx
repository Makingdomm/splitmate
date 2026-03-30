// ProUpgrade.jsx — spec design
import { useState } from 'react';
import useAppStore from '../store/appStore';

export default function ProUpgrade({ onNavigate }) {
  const { paymentStatus, upgradeToProMessage, fetchPaymentStatus } = useAppStore();
  const [loading, setLoading]     = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [msg, setMsg]             = useState('');

  const handleUpgrade = async (stars) => {
    setLoading(true); setMsg('');
    try { await upgradeToProMessage(stars); setMsg('✅ Invoice sent! Complete payment in your Telegram chat.'); }
    catch (e) { setMsg('❌ ' + (e.message||'Something went wrong')); }
    finally { setLoading(false); }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await fetchPaymentStatus();
      const updated = useAppStore.getState().paymentStatus;
      if (updated?.isPro) setMsg(`🎉 ${updated.tier==='elite'?'Elite':'Standard'} plan activated!`);
      else setMsg('Payment not found yet. Try again in a moment.');
    } catch { setMsg('Failed to verify'); }
    finally { setVerifying(false); }
  };

  const standardPrice = paymentStatus?.starsPrice     || 99;
  const elitePrice    = paymentStatus?.eliteStarsPrice || 199;

  // ── Already Pro ───────────────────────────────────────────────────────────
  if (paymentStatus?.isPro) {
    const isElite = paymentStatus.tier === 'elite';
    const expires = paymentStatus.proExpiresAt
      ? new Date(paymentStatus.proExpiresAt).toLocaleDateString()
      : 'Never';

    return (
      <div style={{ minHeight:'100vh', background:'#F5F5F5', paddingBottom:100 }}>
        <div className="page-header">
          <button className="btn-icon" onClick={() => onNavigate('groups')} style={{ fontSize:20, background:'#F5F5F5' }}>‹</button>
          <div className="page-header-title">Your Plan</div>
        </div>
        <div style={{ padding:'24px' }}>

          {/* Current plan card */}
          <div className="card animate-in" style={{ marginBottom:24, background: isElite ? 'linear-gradient(135deg,#3A4219,#4B5320)' : 'linear-gradient(135deg,#4B5320,#6B7B3A)', textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:8 }}>{isElite?'💎':'⭐'}</div>
            <div style={{ fontSize:24, fontWeight:700, color:'#fff', marginBottom:4 }}>
              {isElite ? 'Elite Plan' : 'Standard Plan'}
            </div>
            <div style={{ fontSize:14, color:'rgba(255,255,255,0.7)', marginBottom:20 }}>Active until {expires}</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                '✅ Unlimited groups',
                '✅ Multi-currency',
                '✅ Receipt scanning',
                '✅ TON settlements',
                ...(isElite ? ['✅ Analytics', '✅ Priority support'] : []),
              ].map((f,i) => (
                <div key={i} style={{ background:'rgba(255,255,255,0.12)', borderRadius:8, padding:'8px 10px', fontSize:12, color:'#fff', textAlign:'left' }}>{f}</div>
              ))}
            </div>
          </div>

          {/* Upgrade to Elite CTA */}
          {!isElite && (
            <div className="card" style={{ marginBottom:24 }}>
              <div style={{ fontSize:20, fontWeight:600, color:'#333', marginBottom:6 }}>💎 Upgrade to Elite</div>
              <div style={{ fontSize:14, color:'#CCCCCC', marginBottom:16 }}>Analytics dashboard, priority support & early features.</div>
              <button className="btn-primary" onClick={() => handleUpgrade(elitePrice)} disabled={loading}>
                {loading ? <span className="spinner" style={{width:16,height:16,borderColor:'rgba(255,255,255,0.3)',borderTopColor:'#fff'}} /> : null}
                {loading ? 'Sending…' : `Upgrade for ${elitePrice} ⭐`}
              </button>
              {msg && <div style={{ marginTop:10, fontSize:13, color: msg.startsWith('✅')||msg.startsWith('🎉') ? '#28A745' : '#DC3545', textAlign:'center' }}>{msg}</div>}
            </div>
          )}

          <button className="btn-secondary" onClick={() => onNavigate('groups')}>← Back to Groups</button>
        </div>
      </div>
    );
  }

  // ── Not Pro ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#F5F5F5', paddingBottom:100 }}>
      <div className="page-header">
        <button className="btn-icon" onClick={() => onNavigate('groups')} style={{ fontSize:20, background:'#F5F5F5' }}>‹</button>
        <div className="page-header-title">Upgrade SplitMate</div>
      </div>

      <div style={{ padding:'24px' }}>
        {/* Hero */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:48, marginBottom:10 }}>⭐</div>
          <div style={{ fontSize:24, fontWeight:700, color:'#333', marginBottom:4 }}>Choose Your Plan</div>
          <div style={{ fontSize:14, color:'#CCCCCC' }}>Unlock the full SplitMate experience</div>
        </div>

        {/* Standard Plan — spec §2.2 General Card */}
        <div className="card" style={{ marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div>
              <div style={{ fontSize:20, fontWeight:600, color:'#333' }}>⭐ Standard</div>
              <div style={{ fontSize:12, color:'#CCCCCC' }}>Per month</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:24, fontWeight:700, color:'#333' }}>{standardPrice} ⭐</div>
              <div style={{ fontSize:11, color:'#CCCCCC' }}>Telegram Stars</div>
            </div>
          </div>
          {['Unlimited groups','Multi-currency support','AI receipt scanning','TON wallet settlements','Automated reminders'].map((f,i) => (
            <div key={i} style={{ fontSize:14, color:'#333', lineHeight:'24px', paddingBottom:4 }}>✓ {f}</div>
          ))}
          <div style={{ height:1, background:'#F5F5F5', margin:'16px 0' }} />
          <button className="btn-primary" onClick={() => handleUpgrade(standardPrice)} disabled={loading}>
            {loading ? <span className="spinner" style={{width:16,height:16,borderColor:'rgba(255,255,255,0.3)',borderTopColor:'#fff'}} /> : null}
            {loading ? 'Sending…' : `Get Standard — ${standardPrice} ⭐`}
          </button>
        </div>

        {/* Elite Plan */}
        <div className="card" style={{ marginBottom:16, border:'2px solid #4B5320', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, right:0, background:'#4B5320', borderRadius:'0 12px 0 8px', padding:'4px 12px', fontSize:11, fontWeight:700, color:'#fff' }}>
            BEST VALUE
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, paddingTop:4 }}>
            <div>
              <div style={{ fontSize:20, fontWeight:600, color:'#333' }}>💎 Elite</div>
              <div style={{ fontSize:12, color:'#CCCCCC' }}>Per month</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:24, fontWeight:700, color:'#4B5320' }}>{elitePrice} ⭐</div>
              <div style={{ fontSize:11, color:'#CCCCCC' }}>Telegram Stars</div>
            </div>
          </div>
          {['Everything in Standard','Advanced analytics dashboard','Priority support','Early access to features'].map((f,i) => (
            <div key={i} style={{ fontSize:14, color:'#333', lineHeight:'24px', paddingBottom:4 }}>✓ {f}</div>
          ))}
          <div style={{ height:1, background:'#F5F5F5', margin:'16px 0' }} />
          <button className="btn-primary" onClick={() => handleUpgrade(elitePrice)} disabled={loading} style={{ background:'linear-gradient(135deg,#3A4219,#4B5320)' }}>
            {loading ? <span className="spinner" style={{width:16,height:16,borderColor:'rgba(255,255,255,0.3)',borderTopColor:'#fff'}} /> : null}
            {loading ? 'Sending…' : `Get Elite — ${elitePrice} ⭐`}
          </button>
        </div>

        {msg && (
          <div style={{ background: msg.startsWith('✅')||msg.startsWith('🎉') ? 'rgba(40,167,69,0.08)' : 'rgba(220,53,69,0.08)', border:`1px solid ${msg.startsWith('✅')||msg.startsWith('🎉') ? 'rgba(40,167,69,0.25)' : 'rgba(220,53,69,0.25)'}`, borderRadius:8, padding:'12px 16px', marginBottom:16, fontSize:14, color: msg.startsWith('✅')||msg.startsWith('🎉') ? '#28A745' : '#DC3545', textAlign:'center' }}>
            {msg}
          </div>
        )}

        {msg.includes('Invoice') && (
          <button className="btn-secondary" onClick={handleVerify} disabled={verifying} style={{ marginBottom:16 }}>
            {verifying ? <span className="spinner" style={{width:14,height:14}} /> : null}
            {verifying ? 'Checking…' : '🔄 I paid — verify now'}
          </button>
        )}

        <div style={{ textAlign:'center', fontSize:12, color:'#CCCCCC' }}>
          Paid with Telegram Stars · Cancel anytime · No hidden fees
        </div>
      </div>
    </div>
  );
}
