import React, { useState } from 'react';
import useAppStore from '../store/appStore.js';

export default function SettleUp({ onNavigate, onToast }) {
  const { activeGroup, settleDebt, paymentStatus } = useAppStore();
  const pendingSettlement = useAppStore(s => s.pendingSettlement);
  const [method, setMethod]   = useState('manual');
  const [submitting, setSubmitting] = useState(false);

  if (!pendingSettlement || !activeGroup) { onNavigate('group-detail'); return null; }

  const { from, to, amount } = pendingSettlement;

  const handleSettle = async () => {
    setSubmitting(true);
    try {
      if (method === 'ton') {
        onToast('TON payment — connect wallet first', 'error');
        setSubmitting(false);
        return;
      }
      await settleDebt({ groupId: activeGroup.id, toUserId: to.telegram_id, amount, currency: activeGroup.currency, method, txHash: null });
      onToast(`✅ Settled ${amount.toFixed(2)} ${activeGroup.currency} with ${to.full_name}`);
      onNavigate('group-detail');
    } catch (err) {
      onToast(err.message, 'error');
    } finally { setSubmitting(false); }
  };

  const METHODS = [
    { key:'manual', icon:'✓', title:'Mark as paid', desc:'Record payment made outside the app' },
    { key:'ton',    icon:'💎', title:'Pay with TON', desc:'On-chain payment via TON wallet', pro:true },
  ];

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#060818 0%,#0a0f2e 40%,#060818 100%)', paddingBottom:40, position:'relative', overflow:'hidden' }}>
      <style>{`@keyframes settle-glow{0%,100%{box-shadow:0 0 28px rgba(34,212,122,0.4)}50%{box-shadow:0 0 44px rgba(34,212,122,0.65)}} .settle-btn{animation:settle-glow 2.5s ease-in-out infinite;} .settle-btn:active{transform:scale(0.97);} .method-card:active{transform:scale(0.985);}`}</style>
      <div style={{ position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)', width:340, height:340, background:'radial-gradient(circle,rgba(34,212,122,0.10) 0%,transparent 65%)', borderRadius:'50%', pointerEvents:'none' }} />

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'20px 16px 24px', position:'relative', zIndex:1 }}>
        <button onClick={() => onNavigate('group-detail')} style={{ width:36, height:36, borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'#a0b0e0', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>‹</button>
        <div>
          <h1 style={{ fontSize:20, fontWeight:900, color:'#fff', letterSpacing:-0.3 }}>Settle Up</h1>
          <p style={{ fontSize:12, color:'#4a5080' }}>Record your payment</p>
        </div>
      </div>

      <div style={{ padding:'0 16px', position:'relative', zIndex:1 }}>

        {/* Amount hero card */}
        <div style={{ background:'linear-gradient(135deg,rgba(34,212,122,0.10),rgba(34,212,122,0.04))', border:'1px solid rgba(34,212,122,0.2)', borderRadius:24, padding:'28px 24px', textAlign:'center', marginBottom:28, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(34,212,122,0.4),transparent)' }} />
          <div style={{ fontSize:13, fontWeight:700, color:'#1a7a4a', textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 }}>You owe</div>
          <div style={{ fontSize:42, fontWeight:900, color:'#22d47a', letterSpacing:-1, marginBottom:16 }}>
            {activeGroup.currency} {amount.toFixed(2)}
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:13, color:'#4a5080', marginBottom:4 }}>From</div>
              <div style={{ fontSize:15, fontWeight:800, color:'#e8eeff' }}>You</div>
            </div>
            <div style={{ fontSize:24, color:'#22d47a' }}>→</div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:13, color:'#4a5080', marginBottom:4 }}>To</div>
              <div style={{ fontSize:15, fontWeight:800, color:'#e8eeff' }}>{to.full_name}</div>
            </div>
          </div>
        </div>

        {/* Payment method */}
        <div style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 }}>Payment Method</div>
        <div style={{ marginBottom:28 }}>
          {METHODS.map(m => {
            const active = method === m.key;
            const locked = m.pro && !paymentStatus?.isPro;
            return (
              <div key={m.key} className="method-card"
                onClick={() => locked ? onNavigate('pro') : setMethod(m.key)}
                style={{
                  display:'flex', alignItems:'center', gap:14, padding:'16px',
                  background: active ? 'linear-gradient(135deg,rgba(79,142,247,0.15),rgba(106,94,247,0.10))' : 'rgba(255,255,255,0.03)',
                  border: active ? '1.5px solid rgba(79,142,247,0.5)' : '1px solid rgba(255,255,255,0.07)',
                  borderRadius:16, marginBottom:10, cursor:'pointer', transition:'all 0.15s',
                  opacity: locked ? 0.5 : 1,
                }}
              >
                <div style={{ width:44, height:44, borderRadius:14, flexShrink:0, background: active ? 'linear-gradient(135deg,rgba(79,142,247,0.25),rgba(106,94,247,0.2))' : 'rgba(255,255,255,0.05)', border: active ? '1px solid rgba(79,142,247,0.4)' : '1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{m.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color: active ? '#a0c4ff' : '#c8d0f0', marginBottom:3 }}>
                    {m.title}{locked && ' ⭐'}
                  </div>
                  <div style={{ fontSize:12, color:'#4a5080' }}>{m.desc}</div>
                </div>
                <div style={{ width:20, height:20, borderRadius:'50%', border: active ? '2px solid #4f8ef7' : '2px solid rgba(255,255,255,0.15)', background: active ? '#4f8ef7' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {active && <div style={{ width:8, height:8, borderRadius:'50%', background:'#fff' }} />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Confirm button */}
        <button
          className="settle-btn"
          onClick={handleSettle}
          disabled={submitting}
          style={{
            width:'100%', height:56,
            background: submitting ? 'rgba(34,212,122,0.2)' : 'linear-gradient(135deg,#10b458,#22d47a)',
            border:'none', borderRadius:18,
            fontSize:16, fontWeight:800, color: submitting ? '#22d47a' : '#001a0a',
            cursor:'pointer', transition:'transform 0.1s',
          }}
        >
          {submitting ? '⏳ Recording…' : '✅ Confirm Settlement'}
        </button>
      </div>
    </div>
  );
}
