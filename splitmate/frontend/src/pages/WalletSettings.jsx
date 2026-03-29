// =============================================================================
// WalletSettings.jsx — Manage crypto wallets + TON Connect
// Users can connect TON wallet with one tap (auto-fills address)
// or manually enter addresses for other chains
// =============================================================================

import React, { useState, useEffect } from 'react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import api from '../utils/api.js';

const CHAINS = [
  { id: 'ETH',        label: 'Ethereum',      icon: '⟠',  placeholder: '0x...',   color: '#627EEA' },
  { id: 'BTC',        label: 'Bitcoin',       icon: '₿',  placeholder: 'bc1q...', color: '#F7931A' },
  { id: 'USDT_TRC20', label: 'USDT (TRC-20)', icon: '💵', placeholder: 'T...',    color: '#26A17B' },
  { id: 'USDT_ERC20', label: 'USDT (ERC-20)', icon: '💵', placeholder: '0x...',   color: '#26A17B' },
  { id: 'SOL',        label: 'Solana',        icon: '◎',  placeholder: '...',     color: '#9945FF' },
  { id: 'BNB',        label: 'BNB Chain',     icon: '🟡', placeholder: '0x...',   color: '#F3BA2F' },
];

export default function WalletSettings({ onNavigate, onToast }) {
  const [tonConnectUI]   = useTonConnectUI();
  const tonAddress       = useTonAddress(); // friendly address, auto-updates

  const [wallets, setWallets]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [addChain, setAddChain] = useState(null);
  const [newAddr, setNewAddr]   = useState('');
  const [newLabel, setNewLabel] = useState('');

  // ── Load saved wallets on mount ───────────────────────────────────────────
  useEffect(() => {
    api.wallets.mine()
      .then(r => { setWallets(r.wallets || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // ── When TON wallet connects, auto-save the address ───────────────────────
  useEffect(() => {
    if (!tonAddress) return;
    const alreadySaved = wallets.find(w => w.chain === 'TON' && w.address === tonAddress);
    if (alreadySaved) return;
    // Replace or add TON entry
    const updated = [
      ...wallets.filter(w => w.chain !== 'TON'),
      { chain: 'TON', address: tonAddress, label: 'TON Wallet' },
    ];
    save(updated, '💎 TON wallet connected!');
  }, [tonAddress]);

  // ── Persist wallets ───────────────────────────────────────────────────────
  const save = async (updated, successMsg = 'Wallets saved ✅') => {
    setSaving(true);
    try {
      const r = await api.wallets.save(updated);
      setWallets(r.wallets || updated);
      onToast(successMsg);
    } catch (err) {
      onToast(err.message, 'error');
    } finally { setSaving(false); }
  };

  const handleAdd = async () => {
    if (!newAddr.trim()) { onToast('Enter a wallet address', 'error'); return; }
    const updated = [
      ...wallets,
      { chain: addChain, address: newAddr.trim(), label: newLabel.trim() || CHAINS.find(c => c.id === addChain)?.label },
    ];
    setAddChain(null); setNewAddr(''); setNewLabel('');
    await save(updated);
  };

  const handleRemove = async (idx) => {
    const w = wallets[idx];
    // If removing TON wallet, also disconnect TON Connect
    if (w.chain === 'TON' && tonAddress) {
      await tonConnectUI.disconnect();
    }
    const updated = wallets.filter((_, i) => i !== idx);
    await save(updated);
  };

  const chain = addChain ? CHAINS.find(c => c.id === addChain) : null;
  const hasTon = !!wallets.find(w => w.chain === 'TON');

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#060818 0%,#0a0f2e 40%,#060818 100%)', paddingBottom: 80, position: 'relative', overflow: 'hidden' }}>
      <style>{`.wallet-row:active{transform:scale(0.985);} .chain-btn:active{transform:scale(0.95);} .ton-btn:active{transform:scale(0.96);}`}</style>

      {/* bg glow */}
      <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 360, height: 360, background: 'radial-gradient(circle,rgba(99,78,247,0.12) 0%,transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px 20px', position: 'relative', zIndex: 1 }}>
        <button onClick={() => onNavigate('group-detail')} style={{ width: 36, height: 36, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: '#a0b0e0', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: -0.3 }}>My Crypto Wallets</h1>
          <p style={{ fontSize: 12, color: '#4a5080' }}>Others see these when settling up</p>
        </div>
      </div>

      <div style={{ padding: '0 16px', position: 'relative', zIndex: 1 }}>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#4a5080', padding: 40 }}>Loading…</div>
        ) : (
          <>
            {/* ── TON Connect Hero ───────────────────────────────────────── */}
            <div style={{ background: 'linear-gradient(135deg,rgba(0,136,204,0.15),rgba(0,60,120,0.1))', border: '1px solid rgba(0,136,204,0.35)', borderRadius: 20, padding: '18px 18px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(0,136,204,0.6),transparent)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(0,136,204,0.25)', border: '1px solid rgba(0,136,204,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>💎</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#60c8f0' }}>TON Wallet</div>
                  <div style={{ fontSize: 12, color: '#3a6880' }}>
                    {tonAddress
                      ? `${tonAddress.slice(0,6)}…${tonAddress.slice(-4)}`
                      : 'Connect to receive TON payments'}
                  </div>
                </div>
                {tonAddress && (
                  <div style={{ marginLeft: 'auto', background: 'rgba(0,200,100,0.15)', border: '1px solid rgba(0,200,100,0.3)', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#40e080' }}>
                    Connected ✓
                  </div>
                )}
              </div>

              {!tonAddress ? (
                <button
                  className="ton-btn"
                  onClick={() => tonConnectUI.openModal()}
                  style={{ width: '100%', padding: '13px 0', background: 'linear-gradient(135deg,#0088cc,#006bb3)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', letterSpacing: 0.3 }}
                >
                  Connect TON Wallet
                </button>
              ) : (
                <button
                  className="ton-btn"
                  onClick={() => tonConnectUI.disconnect()}
                  style={{ width: '100%', padding: '11px 0', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.25)', borderRadius: 14, color: '#ff8080', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Disconnect wallet
                </button>
              )}
            </div>

            {/* ── Saved wallets list ─────────────────────────────────────── */}
            {wallets.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#3d4870', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Your Wallets</div>
                {wallets.map((w, i) => {
                  const ch = w.chain === 'TON'
                    ? { icon: '💎', label: 'TON', color: '#0088cc' }
                    : CHAINS.find(c => c.id === w.chain);
                  return (
                    <div key={i} className="wallet-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, marginBottom: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${ch?.color || '#4f8ef7'}22`, border: `1px solid ${ch?.color || '#4f8ef7'}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{ch?.icon || '🔑'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#c8d0f0' }}>{w.label || ch?.label || w.chain}</div>
                        <div style={{ fontSize: 11, color: '#4a6080', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.address}</div>
                      </div>
                      <button onClick={() => handleRemove(i)} style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid rgba(255,80,80,0.2)', background: 'rgba(255,80,80,0.08)', color: '#ff6060', fontSize: 14, cursor: 'pointer', flexShrink: 0 }}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {wallets.length === 0 && (
              <div style={{ textAlign: 'center', padding: '28px 16px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 20, marginBottom: 24 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🔑</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#8090c0', marginBottom: 4 }}>No wallets yet</div>
                <div style={{ fontSize: 12, color: '#4a5080' }}>Connect TON above or add other chains below</div>
              </div>
            )}

            {/* ── Add other chains ───────────────────────────────────────── */}
            {wallets.length < 10 && !addChain && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#3d4870', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Add Other Chain</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {CHAINS.map(ch => (
                    <button key={ch.id} className="chain-btn"
                      onClick={() => { setAddChain(ch.id); setNewAddr(''); setNewLabel(''); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span style={{ fontSize: 20 }}>{ch.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#a0b0d0' }}>{ch.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Add form */}
            {addChain && chain && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${chain.color}44`, borderRadius: 20, padding: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 24 }}>{chain.icon}</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#e8eeff' }}>Add {chain.label}</span>
                  <button onClick={() => setAddChain(null)} style={{ marginLeft: 'auto', width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: '#a0b0e0', fontSize: 14, cursor: 'pointer' }}>✕</button>
                </div>
                <input value={newAddr} onChange={e => setNewAddr(e.target.value)} placeholder={chain.placeholder}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 14px', color: '#e8eeff', fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box', marginBottom: 10, outline: 'none' }}
                />
                <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Label (optional)"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 14px', color: '#e8eeff', fontSize: 13, boxSizing: 'border-box', marginBottom: 14, outline: 'none' }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setAddChain(null)} style={{ flex: 1, padding: '12px 0', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#a0b0d0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleAdd} disabled={saving} style={{ flex: 2, padding: '12px 0', background: `linear-gradient(135deg,${chain.color},${chain.color}bb)`, border: 'none', borderRadius: 12, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                    {saving ? 'Saving…' : 'Save Wallet'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
