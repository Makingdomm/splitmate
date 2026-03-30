// SettleUp.jsx — spec design, fully functional TON / crypto / cash
import React, { useState, useEffect } from 'react';
import useAppStore from '../store/appStore.js';
import api from '../utils/api.js';

const CHAIN_META = {
  TON:        { icon:'💎', color:'#0088cc', label:'TON' },
  ETH:        { icon:'⟠',  color:'#627EEA', label:'ETH' },
  BTC:        { icon:'₿',  color:'#F7931A', label:'BTC' },
  USDT_TRC20: { icon:'💵', color:'#26A17B', label:'USDT' },
  USDT_ERC20: { icon:'💵', color:'#26A17B', label:'USDT' },
  SOL:        { icon:'◎',  color:'#9945FF', label:'SOL' },
  BNB:        { icon:'🟡', color:'#F3BA2F', label:'BNB' },
};

function CopyButton({ text, onToast }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); onToast('Copied!'); setTimeout(()=>setCopied(false),2000); }
    catch { onToast('Tap & hold to copy','error'); }
  };
  return (
    <button onClick={handle} className="btn-inline" style={{ background: copied ? '#28A745' : '#4B5320' }}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

export default function SettleUp({ onNavigate, onToast }) {
  const { activeGroup, settleDebt } = useAppStore();
  const pendingSettlement = useAppStore(s => s.pendingSettlement);

  const [method, setMethod]       = useState('manual');
  const [cryptoMethod, setCrypto] = useState(null);
  const [txHash, setTxHash]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [creditorWallets, setCreditorWallets] = useState([]);
  const [loadingWallets, setLoadingWallets]   = useState(false);

  const { from, to, amount } = pendingSettlement || {};

  useEffect(() => {
    if (!to?.telegram_id) return;
    setLoadingWallets(true);
    api.wallets.ofUser(to.telegram_id)
      .then(r => { setCreditorWallets(r.wallets||[]); setLoadingWallets(false); })
      .catch(() => setLoadingWallets(false));
  }, [to?.telegram_id]);

  if (!pendingSettlement || !activeGroup) { onNavigate('group-detail'); return null; }

  const openTelegramWallet = () => {
    const tonWallet = creditorWallets.find(w => w.chain === 'TON');
    const amountNano = Math.round(amount * 1_000_000_000);
    const comment = encodeURIComponent(`SplitMate: ${activeGroup.name}`);
    if (tonWallet?.address) {
      const url = `ton://transfer/${tonWallet.address}?amount=${amountNano}&text=${comment}`;
      window.Telegram?.WebApp?.openTelegramLink
        ? window.Telegram.WebApp.openTelegramLink(url)
        : window.open(url, '_blank');
    } else {
      onToast('Recipient has no TON wallet saved','error');
    }
  };

  const handleSettle = async () => {
    setSubmitting(true);
    try {
      await settleDebt({
        groupId:  activeGroup.id,
        toUserId: to.telegram_id,
        amount,
        currency: activeGroup.currency,
        method:   method === 'crypto' ? (cryptoMethod?.chain?.toLowerCase()||'crypto') : method,
        txHash:   txHash.trim() || null,
      });
      onToast(`✅ Settled ${amount.toFixed(2)} ${activeGroup.currency} with ${to.full_name}`);
      onNavigate('group-detail');
    } catch (err) { onToast(err.message,'error'); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#F5F5F5', paddingBottom:40 }}>

      {/* ── Header — spec §2.11 ── */}
      <div className="page-header">
        <button className="btn-icon" onClick={() => onNavigate('group-detail')} style={{ fontSize:20, background:'#F5F5F5' }}>‹</button>
        <div style={{ flex:1 }}>
          <div className="page-header-title">Settle Up</div>
          <div className="page-header-sub">Record your payment</div>
        </div>
      </div>

      <div style={{ padding:'24px 24px 0' }}>

        {/* ── Amount Card — spec §2.2 General Card ── */}
        <div className="card animate-in" style={{ marginBottom:24, textAlign:'center' }}>
          <div style={{ fontSize:14, color:'#CCCCCC', marginBottom:4 }}>You owe</div>
          {/* Display — 32px bold, red = owed amount */}
          <div style={{ fontSize:32, fontWeight:700, color:'#DC3545', lineHeight:'40px', marginBottom:16 }}>
            {activeGroup.currency} {amount?.toFixed(2)}
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:12, color:'#CCCCCC', marginBottom:2 }}>From</div>
              <div style={{ fontSize:16, fontWeight:600, color:'#333' }}>You</div>
            </div>
            <div style={{ fontSize:20, color:'#4B5320' }}>→</div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:12, color:'#CCCCCC', marginBottom:2 }}>To</div>
              <div style={{ fontSize:16, fontWeight:600, color:'#333' }}>{to?.full_name}</div>
            </div>
          </div>
        </div>

        {/* ── Payment Method — spec §3.2 Quick Actions style ── */}
        <div style={{ fontSize:14, fontWeight:600, color:'#333', marginBottom:12 }}>How did you pay?</div>
        <div style={{ display:'flex', gap:10, marginBottom:24 }}>
          {[
            { key:'manual', icon:'✓',  label:'Cash / Bank' },
            { key:'wallet', icon:'💎', label:'TON Wallet' },
            { key:'crypto', icon:'🔑', label:'Crypto' },
          ].map(m => {
            const active = method === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setMethod(m.key)}
                style={{
                  flex:1, padding:'14px 6px',
                  background: active ? 'rgba(75,83,32,0.08)' : '#fff',
                  border: `${active?'1.5px':'1px'} solid ${active?'#4B5320':'#CCCCCC'}`,
                  borderRadius:8, cursor:'pointer', textAlign:'center',
                  transition:'all 0.15s', boxShadow: active ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ fontSize:22, marginBottom:4 }}>{m.icon}</div>
                <div style={{ fontSize:11, fontWeight:600, color: active ? '#4B5320' : '#CCCCCC' }}>{m.label}</div>
              </button>
            );
          })}
        </div>

        {/* ── TON Wallet Flow ── */}
        {method === 'wallet' && (
          <div className="card animate-in" style={{ marginBottom:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:'rgba(0,136,204,0.10)', border:'1px solid rgba(0,136,204,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>💎</div>
              <div>
                <div style={{ fontSize:16, fontWeight:600, color:'#333' }}>Pay with TON</div>
                <div style={{ fontSize:12, color:'#CCCCCC' }}>Opens TON wallet app</div>
              </div>
            </div>
            {loadingWallets ? (
              <div style={{ display:'flex', gap:8, alignItems:'center', color:'#CCCCCC', fontSize:13 }}><div className="spinner" style={{width:14,height:14}} /> Loading recipient wallet…</div>
            ) : creditorWallets.find(w=>w.chain==='TON') ? (
              <>
                <div style={{ background:'#F5F5F5', borderRadius:6, padding:'10px 12px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ fontSize:12, color:'#CCCCCC', flex:1, fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {creditorWallets.find(w=>w.chain==='TON')?.address}
                  </div>
                  <CopyButton text={creditorWallets.find(w=>w.chain==='TON')?.address||''} onToast={onToast} />
                </div>
                <button className="btn-primary" onClick={openTelegramWallet}>
                  💎 Open TON Wallet — Pay Now
                </button>
                <div style={{ fontSize:11, color:'#CCCCCC', textAlign:'center', marginTop:10 }}>After paying, tap "Mark as Settled" below</div>
              </>
            ) : (
              <div style={{ fontSize:13, color:'#DC3545', textAlign:'center', padding:'8px 0' }}>
                {to?.full_name} hasn't added a TON wallet yet
              </div>
            )}
          </div>
        )}

        {/* ── Crypto Flow ── */}
        {method === 'crypto' && (
          <div className="card animate-in" style={{ marginBottom:24 }}>
            <div style={{ fontSize:14, fontWeight:600, color:'#333', marginBottom:12 }}>
              {to?.full_name}'s Wallets
            </div>
            {loadingWallets ? (
              <div style={{ display:'flex', gap:8, alignItems:'center', color:'#CCCCCC', fontSize:13 }}><div className="spinner" style={{width:14,height:14}} /> Loading…</div>
            ) : creditorWallets.length === 0 ? (
              <div style={{ fontSize:13, color:'#DC3545', textAlign:'center', padding:'8px 0' }}>
                {to?.full_name} hasn't added any wallets yet
              </div>
            ) : (
              creditorWallets.map((w, i) => {
                const meta  = CHAIN_META[w.chain] || { icon:'🔑', color:'#CCCCCC', label:w.chain };
                const isSel = cryptoMethod?.chain === w.chain;
                return (
                  <div
                    key={i}
                    onClick={() => setCrypto(w)}
                    style={{
                      display:'flex', alignItems:'center', gap:12, padding:'13px 0',
                      borderBottom: i<creditorWallets.length-1?'1px solid #F5F5F5':'none',
                      cursor:'pointer',
                      background: isSel ? 'rgba(75,83,32,0.04)' : 'transparent',
                      borderRadius:isSel?8:0, margin:isSel?'0 -16px':0, padding: isSel?'13px 16px':'13px 0',
                    }}
                  >
                    <div style={{ width:40, height:40, borderRadius:'50%', background:`${meta.color}15`, border:`1.5px solid ${meta.color}35`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                      {meta.icon}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:500, color:'#333' }}>{w.label||meta.label}</div>
                      <div style={{ fontSize:11, color:'#CCCCCC', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{w.address}</div>
                    </div>
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <CopyButton text={w.address} onToast={onToast} />
                      {isSel && <div style={{ width:20, height:20, borderRadius:'50%', background:'#4B5320', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#fff' }}>✓</div>}
                    </div>
                  </div>
                );
              })
            )}

            {cryptoMethod && (
              <div style={{ marginTop:16 }}>
                <label className="field-label">Transaction Hash (optional)</label>
                <input
                  className="field-input"
                  type="text"
                  placeholder="Paste tx hash for proof…"
                  value={txHash}
                  onChange={e => setTxHash(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Manual / Notes for cash ── */}
        {method === 'manual' && (
          <div className="card animate-in" style={{ marginBottom:24 }}>
            <div style={{ fontSize:14, fontWeight:600, color:'#333', marginBottom:8 }}>Note (optional)</div>
            <input
              className="field-input"
              type="text"
              placeholder="e.g. Paid cash in person…"
              value={txHash}
              onChange={e => setTxHash(e.target.value)}
            />
          </div>
        )}

        {/* ── Mark as Settled CTA — spec §2.1 Primary Button ── */}
        <button className="btn-primary" onClick={handleSettle} disabled={submitting} style={{ marginBottom:12 }}>
          {submitting
            ? <><span className="spinner" style={{width:16,height:16,borderColor:'rgba(255,255,255,0.3)',borderTopColor:'#fff'}} /> Settling…</>
            : '✅ Mark as Settled'
          }
        </button>

        {/* Secondary: cancel */}
        <button className="btn-secondary" onClick={() => onNavigate('group-detail')}>
          Cancel
        </button>
      </div>
    </div>
  );
}
