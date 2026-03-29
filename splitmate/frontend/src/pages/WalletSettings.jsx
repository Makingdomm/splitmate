import React, { useState, useEffect } from 'react';
import api from '../utils/api.js';

const CHAINS = [
  { id: 'TON',        label: 'TON',            icon: '💎', placeholder: 'EQA...',  color: '#0088cc' },
  { id: 'ETH',        label: 'Ethereum',        icon: '⟠',  placeholder: '0x...',  color: '#627EEA' },
  { id: 'BTC',        label: 'Bitcoin',         icon: '₿',  placeholder: 'bc1q...', color: '#F7931A' },
  { id: 'USDT_TRC20', label: 'USDT (TRC-20)',   icon: '💵', placeholder: 'T...',   color: '#26A17B' },
  { id: 'USDT_ERC20', label: 'USDT (ERC-20)',   icon: '💵', placeholder: '0x...',  color: '#26A17B' },
  { id: 'SOL',        label: 'Solana',          icon: '◎',  placeholder: '...',    color: '#9945FF' },
  { id: 'BNB',        label: 'BNB Chain',       icon: '🟡', placeholder: '0x...',  color: '#F3BA2F' },
];

export default function WalletSettings({ onNavigate, onToast }) {
  const [wallets, setWallets]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [addChain, setAddChain] = useState(null); // chain being added
  const [newAddr, setNewAddr]   = useState('');
  const [newLabel, setNewLabel] = useState('');

  useEffect(() => {
    api.wallets.mine()
      .then(r => { setWallets(r.wallets || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const save = async (updated) => {
    setSaving(true);
    try {
      const r = await api.wallets.save(updated);
      setWallets(r.wallets || updated);
      onToast('Wallets saved ✅');
    } catch (err) {
      onToast(err.message, 'error');
    } finally { setSaving(false); }
  };

  const handleAdd = async () => {
    if (!newAddr.trim()) { onToast('Enter a wallet address', 'error'); return; }
    const updated = [...wallets, { chain: addChain, address: newAddr.trim(), label: newLabel.trim() || CHAINS.find(c=>c.id===addChain)?.label }];
    setAddChain(null); setNewAddr(''); setNewLabel('');
    await save(updated);
  };

  const handleRemove = async (idx) => {
    const updated = wallets.filter((_, i) => i !== idx);
    await save(updated);
  };

  const chain = addChain ? CHAINS.find(c => c.id === addChain) : null;

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#060818 0%,#0a0f2e 40%,#060818 100%)', paddingBottom:80, position:'relative', overflow:'hidden' }}>
      <style>{`.wallet-row:active{transform:scale(0.985);} .chain-btn:active{transform:scale(0.95);}` }</style>

      {/* bg glow */}
      <div style={{ position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)', width:360, height:360, background:'radial-gradient(circle,rgba(99,78,247,0.12) 0%,transparent 65%)', borderRadius:'50%', pointerEvents:'none' }} />

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px 20px', position:'relative', zIndex:1 }}>
        <button onClick={() => onNavigate('group-detail')} style={{ width:36, height:36, borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'#a0b0e0', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
        <div>
          <h1 style={{ fontSize:20, fontWeight:900, color:'#fff', letterSpacing:-0.3 }}>My Crypto Wallets</h1>
          <p style={{ fontSize:12, color:'#4a5080' }}>Others will see these when settling debts</p>
        </div>
      </div>

      <div style={{ padding:'0 16px', position:'relative', zIndex:1 }}>

        {loading ? (
          <div style={{ textAlign:'center', color:'#4a5080', padding:40 }}>Loading…</div>
        ) : (
          <>
            {/* ── Nudge: add TON address so others can pay you ── */}
            {!wallets.find(w => w.chain === 'TON') && !addChain && (
              <div
                onClick={() => setAddChain('TON')}
                style={{ background:'linear-gradient(135deg,rgba(0,136,204,0.12),rgba(0,80,160,0.08))', border:'1px solid rgba(0,136,204,0.3)', borderRadius:18, padding:'16px 18px', marginBottom:20, cursor:'pointer', display:'flex', alignItems:'center', gap:14, position:'relative', overflow:'hidden' }}
              >
                <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(0,136,204,0.5),transparent)' }} />
                <div style={{ width:46, height:46, borderRadius:14, background:'rgba(0,136,204,0.2)', border:'1px solid rgba(0,136,204,0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>💎</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:800, color:'#60c8f0', marginBottom:3 }}>Add your TON address</div>
                  <div style={{ fontSize:12, color:'#3a6880', lineHeight:1.5 }}>So group members can pay you back directly via Telegram Wallet — tap to add now</div>
                </div>
                <div style={{ fontSize:18, color:'#0088cc' }}>›</div>
              </div>
            )}

            {/* Saved wallets */}
            {wallets.length > 0 && (
              <div style={{ marginBottom:28 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 }}>Your Wallets</div>
                {wallets.map((w, i) => {
                  const ch = CHAINS.find(c => c.id === w.chain);
                  return (
                    <div key={i} className="wallet-row" style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, marginBottom:10 }}>
                      <div style={{ width:40, height:40, borderRadius:12, background:`${ch?.color || '#4f8ef7'}22`, border:`1px solid ${ch?.color || '#4f8ef7'}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{ch?.icon || '🔑'}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'#c8d0f0' }}>{w.label || ch?.label || w.chain}</div>
                        <div style={{ fontSize:11, color:'#4a6080', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{w.address}</div>
                      </div>
                      <button onClick={() => handleRemove(i)} style={{ width:32, height:32, borderRadius:10, border:'1px solid rgba(255,80,80,0.2)', background:'rgba(255,80,80,0.08)', color:'#ff6060', fontSize:14, cursor:'pointer', flexShrink:0 }}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {wallets.length === 0 && (
              <div style={{ textAlign:'center', padding:'32px 16px', background:'rgba(255,255,255,0.02)', border:'1px dashed rgba(255,255,255,0.08)', borderRadius:20, marginBottom:28 }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🔑</div>
                <div style={{ fontSize:15, fontWeight:700, color:'#8090c0', marginBottom:6 }}>No wallets yet</div>
                <div style={{ fontSize:13, color:'#4a5080' }}>Add your crypto addresses so group members can pay you directly</div>
              </div>
            )}

            {/* Add wallet section */}
            {wallets.length < 10 && !addChain && (
              <>
                <div style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 }}>Add Wallet</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {CHAINS.map(ch => (
                    <button key={ch.id} className="chain-btn"
                      onClick={() => { setAddChain(ch.id); setNewAddr(''); setNewLabel(''); }}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, cursor:'pointer', textAlign:'left' }}
                    >
                      <span style={{ fontSize:20 }}>{ch.icon}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:'#a0b0d0' }}>{ch.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Add form */}
            {addChain && chain && (
              <div style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${chain.color}44`, borderRadius:20, padding:20, marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                  <span style={{ fontSize:24 }}>{chain.icon}</span>
                  <span style={{ fontSize:15, fontWeight:800, color:'#e8eeff' }}>Add {chain.label}</span>
                  <button onClick={() => setAddChain(null)} style={{ marginLeft:'auto', width:28, height:28, borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'#a0b0e0', fontSize:14, cursor:'pointer' }}>✕</button>
                </div>
                <input
                  value={newAddr}
                  onChange={e => setNewAddr(e.target.value)}
                  placeholder={chain.placeholder}
                  style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'12px 14px', color:'#e8eeff', fontSize:13, fontFamily:'monospace', boxSizing:'border-box', marginBottom:10, outline:'none' }}
                />
                <input
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder="Label (optional, e.g. 'Personal')"
                  style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'12px 14px', color:'#e8eeff', fontSize:13, boxSizing:'border-box', marginBottom:14, outline:'none' }}
                />
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  style={{ width:'100%', height:48, background:`linear-gradient(135deg,${chain.color},${chain.color}aa)`, border:'none', borderRadius:14, fontSize:14, fontWeight:800, color:'#fff', cursor:'pointer' }}
                >{saving ? 'Saving…' : `Save ${chain.label} Wallet`}</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
