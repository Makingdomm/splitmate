// WalletSettings.jsx — spec design, fully functional TON Connect + manual wallets
import React, { useState, useEffect } from 'react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import api from '../utils/api.js';

const CHAINS = [
  { id:'TON',        label:'TON',           icon:'💎', placeholder:'UQ...',    color:'#0088cc' },
  { id:'ETH',        label:'Ethereum',      icon:'⟠',  placeholder:'0x...',   color:'#627EEA' },
  { id:'BTC',        label:'Bitcoin',       icon:'₿',  placeholder:'bc1q...', color:'#F7931A' },
  { id:'USDT_TRC20', label:'USDT (TRC-20)', icon:'💵', placeholder:'T...',    color:'#26A17B' },
  { id:'USDT_ERC20', label:'USDT (ERC-20)', icon:'💵', placeholder:'0x...',   color:'#26A17B' },
  { id:'SOL',        label:'Solana',        icon:'◎',  placeholder:'...',     color:'#9945FF' },
  { id:'BNB',        label:'BNB Chain',     icon:'🟡', placeholder:'0x...',   color:'#F3BA2F' },
];

export default function WalletSettings({ onNavigate, onToast }) {
  const [tonConnectUI]  = useTonConnectUI();
  const tonAddress      = useTonAddress();

  const [wallets, setWallets]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [addChain, setAddChain] = useState(null);
  const [newAddr, setNewAddr]   = useState('');
  const [newLabel, setNewLabel] = useState('');

  useEffect(() => {
    api.wallets.mine()
      .then(r => { setWallets(r.wallets || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Auto-save TON wallet when connected
  useEffect(() => {
    if (!tonAddress) return;
    const already = wallets.find(w => w.chain === 'TON' && w.address === tonAddress);
    if (already) return;
    const updated = [...wallets.filter(w => w.chain !== 'TON'), { chain:'TON', address:tonAddress, label:'TON Wallet' }];
    save(updated, '💎 TON wallet connected!');
  }, [tonAddress]);

  const save = async (updated, msg = 'Wallets saved ✅') => {
    setSaving(true);
    try {
      const r = await api.wallets.save(updated);
      setWallets(r.wallets || updated);
      onToast(msg);
    } catch (err) { onToast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleAdd = async () => {
    if (!newAddr.trim()) { onToast('Enter a wallet address', 'error'); return; }
    const ch = CHAINS.find(c => c.id === addChain);
    const updated = [...wallets, { chain:addChain, address:newAddr.trim(), label:newLabel.trim()||ch?.label||addChain }];
    setAddChain(null); setNewAddr(''); setNewLabel('');
    await save(updated);
  };

  const handleRemove = async (idx) => {
    const w = wallets[idx];
    if (w.chain === 'TON' && tonAddress) {
      await tonConnectUI.disconnect();
      window.location.reload(); // TON Connect SDK bug workaround
    }
    const updated = wallets.filter((_,i) => i !== idx);
    await save(updated, 'Wallet removed');
  };

  const hasTon = !!wallets.find(w => w.chain === 'TON');

  return (
    <div style={{ minHeight:'100vh', background:'#F5F5F5', paddingBottom:100 }}>

      {/* ── Header — spec §2.11 ── */}
      <div className="page-header">
        <button className="btn-icon" onClick={() => onNavigate(-1)} style={{ fontSize:20, background:'#F5F5F5' }}>‹</button>
        <div style={{ flex:1 }}>
          <div className="page-header-title">My Wallets</div>
          <div className="page-header-sub">Others see these when settling up</div>
        </div>
        {saving && <div className="spinner" />}
      </div>

      {loading ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48, gap:12 }}>
          <div className="spinner" /><span style={{ color:'#CCCCCC' }}>Loading…</span>
        </div>
      ) : (
        <div style={{ padding:'24px 24px 0' }}>

          {/* ── TON Connect Hero — spec §2.12 credit card style ── */}
          <div className="card" style={{ marginBottom:24, background:'linear-gradient(135deg, #4B5320, #6B7B3A)', padding:'22px 22px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <div style={{ width:48, height:48, borderRadius:14, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>💎</div>
              <div>
                <div style={{ fontSize:16, fontWeight:600, color:'#fff', lineHeight:'24px' }}>TON Wallet</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.65)' }}>
                  {tonAddress
                    ? `${tonAddress.slice(0,8)}…${tonAddress.slice(-6)}`
                    : hasTon
                      ? `${wallets.find(w=>w.chain==='TON')?.address?.slice(0,8)}…`
                      : 'Connect to receive TON payments'}
                </div>
              </div>
              {(tonAddress || hasTon) && (
                <div style={{ marginLeft:'auto', background:'rgba(40,167,69,0.25)', border:'1px solid rgba(40,167,69,0.5)', borderRadius:6, padding:'3px 10px', fontSize:11, fontWeight:700, color:'#aef7c8' }}>
                  Connected ✓
                </div>
              )}
            </div>

            {/* TON Connect button */}
            {!tonAddress ? (
              <button
                onClick={() => tonConnectUI.openModal()}
                style={{ width:'100%', padding:'13px 0', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:8, color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:'inherit', letterSpacing:0.2 }}
              >
                Connect TON Wallet
              </button>
            ) : (
              <button
                onClick={async () => { await tonConnectUI.disconnect(); window.location.reload(); }}
                style={{ width:'100%', padding:'11px 0', background:'rgba(220,53,69,0.2)', border:'1px solid rgba(220,53,69,0.4)', borderRadius:8, color:'#ffaaaa', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}
              >
                Disconnect
              </button>
            )}
          </div>

          {/* ── Saved Wallets — spec §2.4 list items ── */}
          {wallets.length > 0 && (
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:20, fontWeight:600, color:'#333', marginBottom:16 }}>Your Wallets</div>
              <div className="card" style={{ padding:0, overflow:'hidden' }}>
                {wallets.map((w, i) => {
                  const ch = w.chain === 'TON'
                    ? { icon:'💎', label:'TON', color:'#0088cc' }
                    : CHAINS.find(c => c.id === w.chain);
                  return (
                    <div key={i} className="list-item">
                      {/* Avatar with chain color */}
                      <div style={{ width:40, height:40, borderRadius:'50%', background:`${ch?.color||'#CCCCCC'}18`, border:`1.5px solid ${ch?.color||'#CCCCCC'}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                        {ch?.icon||'🔑'}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div className="list-item-primary" style={{ fontWeight:500 }}>{w.label||ch?.label||w.chain}</div>
                        <div className="list-item-secondary" style={{ fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {w.address?.slice(0,12)}…{w.address?.slice(-6)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemove(i)}
                        style={{ width:32, height:32, borderRadius:6, border:'1px solid rgba(220,53,69,0.25)', background:'rgba(220,53,69,0.07)', color:'#DC3545', fontSize:13, cursor:'pointer', flexShrink:0 }}
                      >✕</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {wallets.length === 0 && !tonAddress && (
            <div className="card" style={{ marginBottom:24 }}>
              <div className="empty-state">
                <div className="empty-icon">🔑</div>
                <div className="empty-title">No wallets yet</div>
                <div className="empty-desc">Connect TON above or add a crypto address below so group members can pay you directly</div>
              </div>
            </div>
          )}

          {/* ── Add Wallet Section ── */}
          <div style={{ fontSize:20, fontWeight:600, color:'#333', marginBottom:16 }}>Add Wallet</div>

          {/* Chain selector chips */}
          {!addChain ? (
            <div className="chip-row" style={{ marginBottom:24 }}>
              {CHAINS.filter(c => !wallets.find(w => w.chain === c.id)).map(ch => (
                <button
                  key={ch.id}
                  className="chip"
                  onClick={() => setAddChain(ch.id)}
                  style={{ minWidth:72 }}
                >
                  <span className="chip-icon">{ch.icon}</span>
                  {ch.label.split(' ')[0]}
                </button>
              ))}
              {CHAINS.every(c => wallets.find(w => w.chain === c.id)) && (
                <div style={{ fontSize:13, color:'#CCCCCC', padding:'8px 0' }}>All chains added ✓</div>
              )}
            </div>
          ) : (
            <div className="card animate-in" style={{ marginBottom:24 }}>
              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <div style={{ fontSize:24 }}>{CHAINS.find(c=>c.id===addChain)?.icon}</div>
                <div style={{ fontSize:16, fontWeight:600, color:'#333' }}>Add {CHAINS.find(c=>c.id===addChain)?.label}</div>
                <button onClick={() => { setAddChain(null); setNewAddr(''); setNewLabel(''); }} style={{ marginLeft:'auto', width:28, height:28, borderRadius:6, border:'1px solid #CCCCCC', background:'#F5F5F5', color:'#CCCCCC', fontSize:12, cursor:'pointer' }}>✕</button>
              </div>

              <div style={{ marginBottom:16 }}>
                <label className="field-label">Wallet Address</label>
                <input
                  className="field-input"
                  type="text"
                  placeholder={CHAINS.find(c=>c.id===addChain)?.placeholder||'Address'}
                  value={newAddr}
                  onChange={e => setNewAddr(e.target.value)}
                />
              </div>
              <div style={{ marginBottom:16 }}>
                <label className="field-label">Label (optional)</label>
                <input
                  className="field-input"
                  type="text"
                  placeholder={`e.g. My ${CHAINS.find(c=>c.id===addChain)?.label}`}
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                />
              </div>
              <button className="btn-primary" onClick={handleAdd} disabled={saving||!newAddr.trim()}>
                {saving ? <span className="spinner" style={{width:16,height:16,borderWidth:2,borderColor:'rgba(255,255,255,0.3)',borderTopColor:'#fff'}} /> : null}
                {saving ? 'Saving…' : 'Add Wallet'}
              </button>
            </div>
          )}

          {/* Info note */}
          <div style={{ background:'rgba(75,83,32,0.06)', border:'1px solid rgba(75,83,32,0.15)', borderRadius:8, padding:'12px 16px', marginBottom:24 }}>
            <div style={{ fontSize:13, color:'#4B5320', fontWeight:600, marginBottom:4 }}>🔒 Privacy</div>
            <div style={{ fontSize:12, color:'#6B7B3A', lineHeight:'18px' }}>Your wallet addresses are only shown to group members when settling up. We never store private keys.</div>
          </div>

        </div>
      )}
    </div>
  );
}
