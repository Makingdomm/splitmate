import React, { useState, useEffect } from 'react';
import useAppStore from '../store/appStore.js';
import api from '../utils/api.js';

const CHAIN_META = {
  TON:        { icon: '💎', color: '#0088cc', explorer: 'https://tonscan.org/address/' },
  ETH:        { icon: '⟠',  color: '#627EEA', explorer: 'https://etherscan.io/address/' },
  BTC:        { icon: '₿',  color: '#F7931A', explorer: 'https://blockstream.info/address/' },
  USDT_TRC20: { icon: '💵', color: '#26A17B', explorer: 'https://tronscan.org/#/address/' },
  USDT_ERC20: { icon: '💵', color: '#26A17B', explorer: 'https://etherscan.io/address/' },
  SOL:        { icon: '◎',  color: '#9945FF', explorer: 'https://explorer.solana.com/address/' },
  BNB:        { icon: '🟡', color: '#F3BA2F', explorer: 'https://bscscan.com/address/' },
};

function CopyButton({ text, onToast }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onToast('Copied! 📋');
      setTimeout(() => setCopied(false), 2000);
    } catch { onToast('Tap & hold to copy', 'error'); }
  };
  return (
    <button onClick={handleCopy} style={{ padding:'6px 14px', background: copied ? 'rgba(34,212,122,0.15)' : 'rgba(255,255,255,0.08)', border: copied ? '1px solid rgba(34,212,122,0.4)' : '1px solid rgba(255,255,255,0.12)', borderRadius:10, color: copied ? '#22d47a' : '#a0b0e0', fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0, whiteSpace:'nowrap' }}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

export default function SettleUp({ onNavigate, onToast }) {
  const { activeGroup, settleDebt, paymentStatus } = useAppStore();
  const pendingSettlement = useAppStore(s => s.pendingSettlement);

  const [method, setMethod]       = useState('manual'); // 'manual' | 'crypto'
  const [cryptoMethod, setCrypto] = useState(null);     // wallet object of creditor
  const [txHash, setTxHash]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [creditorWallets, setCreditorWallets] = useState([]);
  const [loadingWallets, setLoadingWallets]   = useState(false);

  const { from, to, amount } = pendingSettlement || {};

  useEffect(() => {
    if (!to?.telegram_id) return;
    setLoadingWallets(true);
    api.wallets.ofUser(to.telegram_id)
      .then(r => { setCreditorWallets(r.wallets || []); setLoadingWallets(false); })
      .catch(() => setLoadingWallets(false));
  }, [to?.telegram_id]);

  if (!pendingSettlement || !activeGroup) { onNavigate('group-detail'); return null; }

  const handleSettle = async () => {
    setSubmitting(true);
    try {
      const settlementData = {
        groupId:  activeGroup.id,
        toUserId: to.telegram_id,
        amount,
        currency: activeGroup.currency,
        method:   method === 'crypto' ? (cryptoMethod?.chain?.toLowerCase() || 'crypto') : 'manual',
        txHash:   txHash.trim() || null,
      };
      await settleDebt(settlementData);
      onToast(`✅ Settled ${amount.toFixed(2)} ${activeGroup.currency} with ${to.full_name}`);
      onNavigate('group-detail');
    } catch (err) {
      onToast(err.message, 'error');
    } finally { setSubmitting(false); }
  };

  const selectedChainMeta = cryptoMethod ? (CHAIN_META[cryptoMethod.chain] || {}) : {};

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#060818 0%,#0a0f2e 40%,#060818 100%)', paddingBottom:40, position:'relative', overflow:'hidden' }}>
      <style>{`
        @keyframes settle-glow{0%,100%{box-shadow:0 0 28px rgba(34,212,122,0.4)}50%{box-shadow:0 0 44px rgba(34,212,122,0.65)}}
        .settle-btn{animation:settle-glow 2.5s ease-in-out infinite;}
        .settle-btn:active{transform:scale(0.97);}
        .method-card:active{transform:scale(0.985);}
        .wallet-opt:active{transform:scale(0.98);}
      `}</style>
      <div style={{ position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)', width:340, height:340, background:'radial-gradient(circle,rgba(34,212,122,0.10) 0%,transparent 65%)', borderRadius:'50%', pointerEvents:'none' }} />

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'20px 16px 20px', position:'relative', zIndex:1 }}>
        <button onClick={() => onNavigate('group-detail')} style={{ width:36, height:36, borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'#a0b0e0', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
        <div>
          <h1 style={{ fontSize:20, fontWeight:900, color:'#fff', letterSpacing:-0.3 }}>Settle Up</h1>
          <p style={{ fontSize:12, color:'#4a5080' }}>Record your payment</p>
        </div>
      </div>

      <div style={{ padding:'0 16px', position:'relative', zIndex:1 }}>

        {/* Amount card */}
        <div style={{ background:'linear-gradient(135deg,rgba(34,212,122,0.10),rgba(34,212,122,0.04))', border:'1px solid rgba(34,212,122,0.2)', borderRadius:24, padding:'28px 24px', textAlign:'center', marginBottom:24, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(34,212,122,0.4),transparent)' }} />
          <div style={{ fontSize:13, fontWeight:700, color:'#1a7a4a', textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 }}>You owe</div>
          <div style={{ fontSize:42, fontWeight:900, color:'#22d47a', letterSpacing:-1, marginBottom:14 }}>
            {activeGroup.currency} {amount?.toFixed(2)}
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:12, color:'#4a5080', marginBottom:3 }}>From</div>
              <div style={{ fontSize:14, fontWeight:800, color:'#e8eeff' }}>You</div>
            </div>
            <div style={{ fontSize:22, color:'#22d47a' }}>→</div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:12, color:'#4a5080', marginBottom:3 }}>To</div>
              <div style={{ fontSize:14, fontWeight:800, color:'#e8eeff' }}>{to?.full_name}</div>
            </div>
          </div>
        </div>

        {/* Method selector */}
        <div style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 }}>How did you pay?</div>
        <div style={{ display:'flex', gap:10, marginBottom:20 }}>
          {[
            { key:'manual', icon:'✓', label:'Mark Paid' },
            { key:'crypto', icon:'🔑', label:'Crypto' },
          ].map(m => {
            const active = method === m.key;
            return (
              <button key={m.key} onClick={() => setMethod(m.key)} style={{ flex:1, padding:'14px 10px', background: active ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.03)', border: active ? '1.5px solid rgba(79,142,247,0.5)' : '1px solid rgba(255,255,255,0.07)', borderRadius:16, cursor:'pointer', textAlign:'center' }}>
                <div style={{ fontSize:22, marginBottom:4 }}>{m.icon}</div>
                <div style={{ fontSize:12, fontWeight:700, color: active ? '#a0c4ff' : '#6070a0' }}>{m.label}</div>
              </button>
            );
          })}
        </div>

        {/* ── CRYPTO FLOW ── */}
        {method === 'crypto' && (
          <div style={{ marginBottom:20 }}>

            {/* Creditor's wallets */}
            {loadingWallets ? (
              <div style={{ textAlign:'center', color:'#4a5080', padding:20, background:'rgba(255,255,255,0.02)', borderRadius:16 }}>Loading {to?.full_name}'s wallets…</div>
            ) : creditorWallets.length === 0 ? (
              <div style={{ textAlign:'center', padding:'20px 16px', background:'rgba(255,80,80,0.05)', border:'1px solid rgba(255,80,80,0.12)', borderRadius:16, marginBottom:16 }}>
                <div style={{ fontSize:28, marginBottom:8 }}>😕</div>
                <div style={{ fontSize:14, fontWeight:700, color:'#ff8080', marginBottom:6 }}>{to?.full_name} hasn't added wallets</div>
                <div style={{ fontSize:12, color:'#4a5080' }}>Ask them to open SplitMate Settings → My Crypto Wallets</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 }}>{to?.full_name}'s Wallets — choose one to pay</div>
                {creditorWallets.map((w, i) => {
                  const meta = CHAIN_META[w.chain] || { icon:'🔑', color:'#4f8ef7' };
                  const active = cryptoMethod?.chain === w.chain && cryptoMethod?.address === w.address;
                  return (
                    <div key={i} className="wallet-opt"
                      onClick={() => setCrypto(active ? null : w)}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background: active ? `${meta.color}18` : 'rgba(255,255,255,0.03)', border: active ? `1.5px solid ${meta.color}66` : '1px solid rgba(255,255,255,0.07)', borderRadius:16, marginBottom:10, cursor:'pointer', transition:'all 0.15s' }}
                    >
                      <div style={{ width:40, height:40, borderRadius:12, background:`${meta.color}22`, border:`1px solid ${meta.color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{meta.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color: active ? '#e8eeff' : '#c0cce8', marginBottom:2 }}>{w.label || w.chain}</div>
                        <div style={{ fontSize:11, color:'#5060a0', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{w.address}</div>
                      </div>
                      <CopyButton text={w.address} onToast={onToast} />
                      <div style={{ width:20, height:20, borderRadius:'50%', border: active ? `2px solid ${meta.color}` : '2px solid rgba(255,255,255,0.15)', background: active ? meta.color : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {active && <div style={{ width:8, height:8, borderRadius:'50%', background:'#fff' }} />}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Full address display when selected */}
            {cryptoMethod && (
              <div style={{ background:`${selectedChainMeta.color || '#4f8ef7'}12`, border:`1px solid ${selectedChainMeta.color || '#4f8ef7'}33`, borderRadius:16, padding:16, marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#4a5080', textTransform:'uppercase', letterSpacing:0.7, marginBottom:8 }}>Full Address</div>
                <div style={{ fontSize:12, fontFamily:'monospace', color:'#c0d4ff', wordBreak:'break-all', lineHeight:1.5, marginBottom:10 }}>{cryptoMethod.address}</div>
                <div style={{ display:'flex', gap:8 }}>
                  <CopyButton text={cryptoMethod.address} onToast={onToast} />
                  {selectedChainMeta.explorer && (
                    <button onClick={() => window.Telegram?.WebApp?.openLink?.(selectedChainMeta.explorer + cryptoMethod.address)} style={{ padding:'6px 14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, color:'#8090c0', fontSize:12, fontWeight:700, cursor:'pointer' }}>View Explorer ↗</button>
                  )}
                </div>
              </div>
            )}

            {/* TX hash input */}
            {cryptoMethod && (
              <div style={{ marginBottom:4 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, marginBottom:8 }}>Transaction Hash (optional)</div>
                <input
                  value={txHash}
                  onChange={e => setTxHash(e.target.value)}
                  placeholder="Paste tx hash as proof of payment…"
                  style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'12px 14px', color:'#e8eeff', fontSize:12, fontFamily:'monospace', boxSizing:'border-box', outline:'none' }}
                />
              </div>
            )}
          </div>
        )}

        {/* Manual note */}
        {method === 'manual' && (
          <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'14px 16px', marginBottom:20, fontSize:13, color:'#5060a0', lineHeight:1.5 }}>
            This records that you paid {to?.full_name} outside the app — cash, bank transfer, etc. Your balance will be cleared.
          </div>
        )}

        {/* Manage my wallets link */}
        <button onClick={() => onNavigate('wallet-settings')} style={{ width:'100%', padding:'12px', background:'rgba(255,255,255,0.02)', border:'1px dashed rgba(255,255,255,0.08)', borderRadius:14, color:'#5070b0', fontSize:13, cursor:'pointer', marginBottom:20 }}>
          🔑 Manage my crypto wallets
        </button>

        {/* Confirm button */}
        <button
          className="settle-btn"
          onClick={handleSettle}
          disabled={submitting || (method === 'crypto' && creditorWallets.length > 0 && !cryptoMethod)}
          style={{ width:'100%', height:56, background: submitting ? 'rgba(34,212,122,0.2)' : 'linear-gradient(135deg,#10b458,#22d47a)', border:'none', borderRadius:18, fontSize:16, fontWeight:800, color: submitting ? '#22d47a' : '#001a0a', cursor:'pointer', transition:'transform 0.1s', opacity: (method === 'crypto' && creditorWallets.length > 0 && !cryptoMethod) ? 0.4 : 1 }}
        >
          {submitting ? '⏳ Recording…' : method === 'crypto' && cryptoMethod ? `✅ I Sent via ${cryptoMethod.chain}` : '✅ Confirm Settlement'}
        </button>
      </div>
    </div>
  );
}
