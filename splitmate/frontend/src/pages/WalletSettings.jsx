// WalletSettings.jsx — full crypto chain support with real SVG icons
import React, { useState, useEffect } from 'react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import api from '../utils/api.js';

// Real SVG icons as inline components
const Icons = {
  TON: () => (
    <svg viewBox="0 0 56 56" width="24" height="24" fill="none">
      <circle cx="28" cy="28" r="28" fill="#0098EA"/>
      <path d="M37.5 15H18.5C14.9 15 12.6 18.9 14.4 22L26.6 43.3C27.2 44.4 28.8 44.4 29.4 43.3L41.6 22C43.4 18.9 41.1 15 37.5 15ZM25.5 36.2L18.9 20H25.5V36.2ZM30.5 36.2V20H37.1L30.5 36.2Z" fill="white"/>
    </svg>
  ),
  BTC: () => (
    <svg viewBox="0 0 56 56" width="24" height="24" fill="none">
      <circle cx="28" cy="28" r="28" fill="#F7931A"/>
      <path d="M38.2 24.6c.5-3.4-2.1-5.2-5.6-6.4l1.1-4.6-2.8-.7-1.1 4.4c-.7-.2-1.5-.4-2.2-.5l1.2-4.5-2.8-.7-1.1 4.6c-.6-.1-1.2-.3-1.7-.4l-3.9-1-.7 3s2 .5 2 .5c1.1.3 1.3 1 1.3 1.6l-1.3 5.2c.1 0 .2.1.3.1-.1 0-.2-.1-.3-.1l-1.8 7.2c-.1.4-.5 1-1.3.7 0 0-2-.5-2-.5l-1.4 3.2 3.7.9 2 .5-1.2 4.7 2.8.7 1.2-4.6c.8.2 1.5.4 2.3.6l-1.2 4.5 2.8.7 1.2-4.7c4.8.9 8.4.5 9.9-3.8 1.2-3.5-.1-5.5-2.6-6.8 1.9-.4 3.3-1.7 3.6-4.1zm-6.4 9c-.9 3.5-6.8 1.6-8.7 1.1l1.5-6.2c1.9.5 8.1 1.4 7.2 5.1zm.9-9.1c-.8 3.2-5.7 1.6-7.3 1.2l1.4-5.6c1.6.4 6.8 1.1 5.9 4.4z" fill="white"/>
    </svg>
  ),
  ETH: () => (
    <svg viewBox="0 0 56 56" width="24" height="24" fill="none">
      <circle cx="28" cy="28" r="28" fill="#627EEA"/>
      <path d="M28 10L27.7 11.1V36.1L28 36.4L40 29.4L28 10Z" fill="white" fillOpacity="0.6"/>
      <path d="M28 10L16 29.4L28 36.4V24.1V10Z" fill="white"/>
      <path d="M28 38.7L27.8 39L16 31.7L28 46L40 31.7L28.2 39L28 38.7Z" fill="white" fillOpacity="0.6"/>
      <path d="M28 46L40 31.7L28 38.7V46Z" fill="white"/>
      <path d="M28 36.4L40 29.4L28 24.1V36.4Z" fill="white" fillOpacity="0.2"/>
      <path d="M16 29.4L28 36.4V24.1L16 29.4Z" fill="white" fillOpacity="0.6"/>
    </svg>
  ),
  SOL: () => (
    <svg viewBox="0 0 56 56" width="24" height="24" fill="none">
      <circle cx="28" cy="28" r="28" fill="#9945FF"/>
      <path d="M17 35.5C17.2 35.3 17.5 35.2 17.8 35.2H41.5C42 35.2 42.2 35.8 41.9 36.2L38 40.2C37.8 40.4 37.5 40.5 37.2 40.5H13.5C13 40.5 12.8 39.9 13.1 39.5L17 35.5Z" fill="url(#sol1)"/>
      <path d="M17 16.3C17.2 16.1 17.5 16 17.8 16H41.5C42 16 42.2 16.6 41.9 17L38 21C37.8 21.2 37.5 21.3 37.2 21.3H13.5C13 21.3 12.8 20.7 13.1 20.3L17 16.3Z" fill="url(#sol2)"/>
      <path d="M38 25.8C37.8 25.6 37.5 25.5 37.2 25.5H13.5C13 25.5 12.8 26.1 13.1 26.5L17 30.5C17.2 30.7 17.5 30.8 17.8 30.8H41.5C42 30.8 42.2 30.2 41.9 29.8L38 25.8Z" fill="url(#sol3)"/>
      <defs>
        <linearGradient id="sol1" x1="13" y1="38" x2="42" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00FFA3"/><stop offset="1" stopColor="#DC1FFF"/>
        </linearGradient>
        <linearGradient id="sol2" x1="13" y1="18.6" x2="42" y2="18.6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00FFA3"/><stop offset="1" stopColor="#DC1FFF"/>
        </linearGradient>
        <linearGradient id="sol3" x1="13" y1="28.1" x2="42" y2="28.1" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00FFA3"/><stop offset="1" stopColor="#DC1FFF"/>
        </linearGradient>
      </defs>
    </svg>
  ),
  BNB: () => (
    <svg viewBox="0 0 56 56" width="24" height="24" fill="none">
      <circle cx="28" cy="28" r="28" fill="#F3BA2F"/>
      <path d="M22.5 28L28 22.5L33.5 28L28 33.5L22.5 28Z" fill="white"/>
      <path d="M14 28L17 25L20 28L17 31L14 28Z" fill="white"/>
      <path d="M36 28L39 25L42 28L39 31L36 28Z" fill="white"/>
      <path d="M28 14L31 17L28 20L25 17L28 14Z" fill="white"/>
      <path d="M28 36L31 39L28 42L25 39L28 36Z" fill="white"/>
      <path d="M19.5 19.5L22.5 16.5L28 22L33.5 16.5L36.5 19.5L31 25L28 22L25 25L19.5 19.5Z" fill="white"/>
      <path d="M19.5 36.5L22.5 39.5L28 34L33.5 39.5L36.5 36.5L31 31L28 34L25 31L19.5 36.5Z" fill="white"/>
    </svg>
  ),
  USDT: () => (
    <svg viewBox="0 0 56 56" width="24" height="24" fill="none">
      <circle cx="28" cy="28" r="28" fill="#26A17B"/>
      <path d="M30.2 29.3V29.3C30.1 29.3 28.6 29.5 28 29.5C27.4 29.5 25.9 29.4 25.8 29.3H25.8V26.7H30.2V29.3Z" fill="white"/>
      <path d="M31.5 21H24.5V24H17V26H39V24H31.5V21Z" fill="white"/>
      <path d="M28 30.7C24.3 30.7 21.3 30.1 21.3 29.4C21.3 28.7 24.3 28.1 28 28.1C31.7 28.1 34.7 28.7 34.7 29.4C34.7 30.1 31.7 30.7 28 30.7ZM28 31.9C31.9 31.9 35.1 31.1 35.1 30.1V25.7H20.9V30.1C20.9 31.1 24.1 31.9 28 31.9Z" fill="white"/>
    </svg>
  ),
  MATIC: () => (
    <svg viewBox="0 0 56 56" width="24" height="24" fill="none">
      <circle cx="28" cy="28" r="28" fill="#8247E5"/>
      <path d="M35.6 23.5C35 23.1 34.3 23.1 33.6 23.5L28.9 26.3L25.7 28.1L21 30.9C20.4 31.3 19.7 31.3 19 30.9L15.4 28.8C14.8 28.4 14.4 27.8 14.4 27.1V23C14.4 22.3 14.7 21.7 15.4 21.3L19 19.3C19.6 18.9 20.3 18.9 21 19.3L24.6 21.4C25.2 21.8 25.6 22.4 25.6 23.1V25.9L28.8 24V21.1C28.8 20.4 28.5 19.8 27.8 19.4L21.1 15.5C20.5 15.1 19.8 15.1 19.1 15.5L12.2 19.5C11.6 19.9 11.2 20.5 11.2 21.2V29C11.2 29.7 11.5 30.3 12.2 30.7L19 34.6C19.6 35 20.3 35 21 34.6L25.7 31.8L28.9 30L33.6 27.2C34.2 26.8 34.9 26.8 35.6 27.2L39.2 29.2C39.8 29.6 40.2 30.2 40.2 30.9V35C40.2 35.7 39.9 36.3 39.2 36.7L35.6 38.7C35 39.1 34.3 39.1 33.6 38.7L30 36.7C29.4 36.3 29 35.7 29 35V32.2L25.8 34.1V37C25.8 37.7 26.1 38.3 26.8 38.7L33.6 42.6C34.2 43 34.9 43 35.6 42.6L42.4 38.7C43 38.3 43.4 37.7 43.4 37V29.1C43.4 28.4 43.1 27.8 42.4 27.4L35.6 23.5Z" fill="white"/>
    </svg>
  ),
  AVAX: () => (
    <svg viewBox="0 0 56 56" width="24" height="24" fill="none">
      <circle cx="28" cy="28" r="28" fill="#E84142"/>
      <path d="M32.7 32.8H36.4C36.8 32.8 37 32.5 36.8 32.2L29 18.3C28.8 18 28.4 18 28.2 18.3L24.7 24.3L22.1 18.3C21.9 18 21.5 18 21.3 18.3L13.5 32.2C13.3 32.5 13.5 32.8 13.9 32.8H17.6C18 32.8 18.4 32.5 18.6 32.2L21.7 26.8L24.8 32.2C25 32.5 25.4 32.8 25.8 32.8H27.5L28.9 30.3L32.1 32.2C32.3 32.5 32.5 32.8 32.7 32.8Z" fill="white"/>
    </svg>
  ),
  DOT: () => (
    <svg viewBox="0 0 56 56" width="24" height="24" fill="none">
      <circle cx="28" cy="28" r="28" fill="#E6007A"/>
      <ellipse cx="28" cy="15.5" rx="5.5" ry="5.5" fill="white"/>
      <ellipse cx="28" cy="40.5" rx="5.5" ry="5.5" fill="white"/>
      <ellipse cx="15.5" cy="22" rx="5.5" ry="5.5" fill="white"/>
      <ellipse cx="40.5" cy="22" rx="5.5" ry="5.5" fill="white"/>
      <ellipse cx="15.5" cy="34" rx="5.5" ry="5.5" fill="white"/>
      <ellipse cx="40.5" cy="34" rx="5.5" ry="5.5" fill="white"/>
    </svg>
  ),
  LINK: () => (
    <svg viewBox="0 0 56 56" width="24" height="24" fill="none">
      <circle cx="28" cy="28" r="28" fill="#2A5ADA"/>
      <path d="M28 13L23 16L15 21V31L23 36L28 39L33 36L41 31V21L33 16L28 13ZM35.5 29.5L28 34L20.5 29.5V20.5L28 16L35.5 20.5V29.5Z" fill="white"/>
    </svg>
  ),
  XRP: () => (
    <svg viewBox="0 0 56 56" width="24" height="24" fill="none">
      <circle cx="28" cy="28" r="28" fill="#346AA9"/>
      <path d="M37 16H41L32 25C29.8 27.2 26.2 27.2 24 25L15 16H19L26.6 23.6C27.4 24.4 28.6 24.4 29.4 23.6L37 16Z" fill="white"/>
      <path d="M19 40H15L24 31C26.2 28.8 29.8 28.8 32 31L41 40H37L29.4 32.4C28.6 31.6 27.4 31.6 26.6 32.4L19 40Z" fill="white"/>
    </svg>
  ),
  LTC: () => (
    <svg viewBox="0 0 56 56" width="24" height="24" fill="none">
      <circle cx="28" cy="28" r="28" fill="#BFBBBB"/>
      <path d="M28 10C18.1 10 10 18.1 10 28C10 37.9 18.1 46 28 46C37.9 46 46 37.9 46 28C46 18.1 37.9 10 28 10ZM34.5 36H21.5L23.8 27.8L21.2 28.6L22 25.7L24.6 24.9L27.4 15H32L29.5 23.8L32.1 23L31.3 25.9L28.7 26.7L26.5 34H32.5L34.5 36Z" fill="white"/>
    </svg>
  ),
  ADA: () => (
    <svg viewBox="0 0 56 56" width="24" height="24" fill="none">
      <circle cx="28" cy="28" r="28" fill="#0D1E2D"/>
      <circle cx="28" cy="15" r="2.5" fill="#0133AD"/>
      <circle cx="28" cy="41" r="2.5" fill="#0133AD"/>
      <circle cx="15" cy="21.5" r="2.5" fill="#0133AD"/>
      <circle cx="41" cy="21.5" r="2.5" fill="#0133AD"/>
      <circle cx="15" cy="34.5" r="2.5" fill="#0133AD"/>
      <circle cx="41" cy="34.5" r="2.5" fill="#0133AD"/>
      <circle cx="21.5" cy="18" r="2" fill="#3CC8C8"/>
      <circle cx="34.5" cy="18" r="2" fill="#3CC8C8"/>
      <circle cx="18" cy="28" r="2" fill="#3CC8C8"/>
      <circle cx="38" cy="28" r="2" fill="#3CC8C8"/>
      <circle cx="21.5" cy="38" r="2" fill="#3CC8C8"/>
      <circle cx="34.5" cy="38" r="2" fill="#3CC8C8"/>
      <circle cx="28" cy="28" r="3" fill="#3CC8C8"/>
    </svg>
  ),
  DOGE: () => (
    <svg viewBox="0 0 56 56" width="24" height="24" fill="none">
      <circle cx="28" cy="28" r="28" fill="#C2A633"/>
      <path d="M21 18H29C34 18 38 22 38 28C38 34 34 38 29 38H21V18ZM26 23V33H29C31.2 33 33 31.2 33 28C33 24.8 31.2 23 29 23H26Z" fill="white"/>
      <rect x="19" y="26" width="10" height="4" fill="white"/>
    </svg>
  ),
  TRX: () => (
    <svg viewBox="0 0 56 56" width="24" height="24" fill="none">
      <circle cx="28" cy="28" r="28" fill="#FF060A"/>
      <path d="M41.5 21.8L36.4 17.4C36.1 17.2 35.6 17.1 35.2 17.2L14.2 23.5C13.5 23.7 13.3 24.5 13.7 25L20.3 33.4L19.3 39.7C19.2 40.4 19.9 40.9 20.5 40.6L28.1 36.7C28.3 36.6 28.4 36.5 28.5 36.3L41.8 23.2C42.2 22.7 42.1 22.1 41.5 21.8ZM27.7 33.8L21.8 26L34.5 22.5L27.7 33.8Z" fill="white"/>
    </svg>
  ),
};

const CHAINS = [
  { id:'TON',        label:'TON',           Icon: Icons.TON,   placeholder:'UQ…',     color:'#0088cc', network:'TON Blockchain' },
  { id:'BTC',        label:'Bitcoin',       Icon: Icons.BTC,   placeholder:'bc1q…',   color:'#F7931A', network:'Bitcoin' },
  { id:'ETH',        label:'Ethereum',      Icon: Icons.ETH,   placeholder:'0x…',     color:'#627EEA', network:'ERC-20' },
  { id:'SOL',        label:'Solana',        Icon: Icons.SOL,   placeholder:'…',       color:'#9945FF', network:'Solana' },
  { id:'BNB',        label:'BNB Chain',     Icon: Icons.BNB,   placeholder:'0x…',     color:'#F3BA2F', network:'BEP-20' },
  { id:'USDT_TRC20', label:'USDT',          Icon: Icons.USDT,  placeholder:'T…',      color:'#26A17B', network:'TRC-20' },
  { id:'USDT_ERC20', label:'USDT',          Icon: Icons.USDT,  placeholder:'0x…',     color:'#26A17B', network:'ERC-20' },
  { id:'MATIC',      label:'Polygon',       Icon: Icons.MATIC, placeholder:'0x…',     color:'#8247E5', network:'Polygon' },
  { id:'AVAX',       label:'Avalanche',     Icon: Icons.AVAX,  placeholder:'0x…',     color:'#E84142', network:'C-Chain' },
  { id:'ADA',        label:'Cardano',       Icon: Icons.ADA,   placeholder:'addr1…',  color:'#0133AD', network:'Cardano' },
  { id:'DOT',        label:'Polkadot',      Icon: Icons.DOT,   placeholder:'1…',      color:'#E6007A', network:'Polkadot' },
  { id:'XRP',        label:'XRP',           Icon: Icons.XRP,   placeholder:'r…',      color:'#346AA9', network:'XRP Ledger' },
  { id:'LTC',        label:'Litecoin',      Icon: Icons.LTC,   placeholder:'ltc1…',   color:'#BFBBBB', network:'Litecoin' },
  { id:'LINK',       label:'Chainlink',     Icon: Icons.LINK,  placeholder:'0x…',     color:'#2A5ADA', network:'ERC-20' },
  { id:'DOGE',       label:'Dogecoin',      Icon: Icons.DOGE,  placeholder:'D…',      color:'#C2A633', network:'Dogecoin' },
  { id:'TRX',        label:'TRON',          Icon: Icons.TRX,   placeholder:'T…',      color:'#FF060A', network:'TRON' },
];

export default function WalletSettings({ onNavigate, onToast }) {
  const [tonConnectUI] = useTonConnectUI();
  const tonAddress     = useTonAddress();

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

  // Auto-save TON when connected
  useEffect(() => {
    if (!tonAddress) return;
    const already = wallets.find(w => w.chain === 'TON' && w.address === tonAddress);
    if (already) return;
    const updated = [...wallets.filter(w => w.chain !== 'TON'), { chain:'TON', address:tonAddress, label:'TON Wallet' }];
    save(updated, 'TON wallet connected!');
  }, [tonAddress]);

  const save = async (updated, msg = 'Wallet saved') => {
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
    const updated = [...wallets, { chain:addChain, address:newAddr.trim(), label:newLabel.trim() || ch?.label || addChain }];
    setAddChain(null); setNewAddr(''); setNewLabel('');
    await save(updated);
  };

  const handleRemove = async (idx) => {
    const w = wallets[idx];
    if (w.chain === 'TON' && tonAddress) {
      await tonConnectUI.disconnect();
      window.location.reload();
      return;
    }
    await save(wallets.filter((_, i) => i !== idx), 'Wallet removed');
  };

  const hasTon      = !!wallets.find(w => w.chain === 'TON');
  const addingChain = addChain ? CHAINS.find(c => c.id === addChain) : null;
  const available   = CHAINS.filter(c => !wallets.find(w => w.chain === c.id));

  return (
    <div style={{ minHeight:'100vh', background:'#F5F5F5', paddingBottom:100 }}>

      {/* ── Header ── */}
      <div className="page-header">
        <button className="btn-icon" onClick={() => onNavigate(-1)} style={{ fontSize:20, background:'#F5F5F5' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 8L8 12L12 16" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 12H8" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        <div style={{ flex:1 }}>
          <div className="page-header-title">My Wallets</div>
          <div className="page-header-sub">For crypto settlements with group members</div>
        </div>
        {saving && <div className="spinner" />}
      </div>

      {loading ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48, gap:12 }}>
          <div className="spinner" /><span style={{ color:'#CCCCCC' }}>Loading…</span>
        </div>
      ) : (
        <div style={{ padding:'24px 24px 0' }}>

          {/* ── TON Connect Hero ── */}
          <div className="card" style={{ marginBottom:24, background:'linear-gradient(135deg,#4B5320,#6B7B3A)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <div style={{ width:48, height:48, borderRadius:14, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icons.TON />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:16, fontWeight:600, color:'#fff', lineHeight:'24px' }}>TON Wallet</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.65)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {tonAddress
                    ? `${tonAddress.slice(0,10)}…${tonAddress.slice(-6)}`
                    : hasTon
                      ? `${wallets.find(w=>w.chain==='TON')?.address?.slice(0,10)}…`
                      : 'Connect to receive TON payments'}
                </div>
              </div>
              {(tonAddress || hasTon) && (
                <span style={{ background:'rgba(40,167,69,0.25)', border:'1px solid rgba(40,167,69,0.5)', borderRadius:6, padding:'3px 10px', fontSize:11, fontWeight:700, color:'#aef7c8', flexShrink:0 }}>
                  Connected ✓
                </span>
              )}
            </div>
            {!tonAddress ? (
              <button onClick={() => tonConnectUI.openModal()} style={{ width:'100%', padding:'13px 0', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:8, color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Connect TON Wallet
              </button>
            ) : (
              <button onClick={async () => { await tonConnectUI.disconnect(); window.location.reload(); }} style={{ width:'100%', padding:'11px 0', background:'rgba(220,53,69,0.2)', border:'1px solid rgba(220,53,69,0.4)', borderRadius:8, color:'#ffaaaa', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Disconnect
              </button>
            )}
          </div>

          {/* ── Saved Wallets ── */}
          {wallets.length > 0 && (
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:20, fontWeight:600, color:'#333', marginBottom:16 }}>Your Wallets</div>
              <div className="card" style={{ padding:0, overflow:'hidden' }}>
                {wallets.map((w, i) => {
                  const ch  = CHAINS.find(c => c.id === w.chain) || { label:w.chain, color:'#CCCCCC', network:'', Icon:()=><span>🔑</span> };
                  const Ico = ch.Icon;
                  return (
                    <div key={i} className="list-item">
                      <div style={{ width:40, height:40, borderRadius:'50%', background:`${ch.color}15`, border:`1.5px solid ${ch.color}40`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Ico />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div className="list-item-primary" style={{ fontWeight:500 }}>
                          {w.label || ch.label}
                          {ch.network ? <span style={{ fontSize:11, color:'#CCCCCC', marginLeft:6 }}>{ch.network}</span> : null}
                        </div>
                        <div className="list-item-secondary" style={{ fontFamily:'monospace' }}>
                          {w.address?.slice(0,14)}…{w.address?.slice(-6)}
                        </div>
                      </div>
                      <button onClick={() => handleRemove(i)} style={{ width:32, height:32, borderRadius:6, border:'1px solid rgba(220,53,69,0.25)', background:'rgba(220,53,69,0.07)', color:'#DC3545', fontSize:13, cursor:'pointer', flexShrink:0 }}>✕</button>
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
                <div className="empty-desc">Connect TON above or add any crypto address so group members can pay you directly</div>
              </div>
            </div>
          )}

          {/* ── Add Wallet ── */}
          <div style={{ fontSize:20, fontWeight:600, color:'#333', marginBottom:16 }}>
            {addChain ? `Add ${addingChain?.label}` : 'Add Wallet'}
          </div>

          {!addChain ? (
            /* Chain grid */
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, marginBottom:24 }}>
              {available.map(ch => {
                const Ico = ch.Icon;
                return (
                  <button
                    key={ch.id}
                    onClick={() => setAddChain(ch.id)}
                    style={{
                      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                      gap:6, padding:'14px 6px',
                      background:'#fff', border:'1px solid #F5F5F5',
                      borderRadius:12, cursor:'pointer',
                      boxShadow:'0 1px 3px rgba(0,0,0,0.07)',
                      transition:'all 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = ch.color}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#F5F5F5'}
                  >
                    <Ico />
                    <span style={{ fontSize:10, fontWeight:600, color:'#333', textAlign:'center', lineHeight:1.2 }}>{ch.label}</span>
                    <span style={{ fontSize:9, color:'#CCCCCC', textAlign:'center', lineHeight:1 }}>{ch.network}</span>
                  </button>
                );
              })}
              {available.length === 0 && (
                <div style={{ gridColumn:'1/-1', textAlign:'center', fontSize:13, color:'#CCCCCC', padding:'16px 0' }}>
                  All chains added ✓
                </div>
              )}
            </div>
          ) : (
            /* Add form */
            <div className="card animate-in" style={{ marginBottom:24 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:`${addingChain.color}15`, border:`1.5px solid ${addingChain.color}35`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <addingChain.Icon />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:16, fontWeight:600, color:'#333' }}>{addingChain.label}</div>
                  <div style={{ fontSize:12, color:'#CCCCCC' }}>{addingChain.network}</div>
                </div>
                <button onClick={() => { setAddChain(null); setNewAddr(''); setNewLabel(''); }} style={{ width:28, height:28, borderRadius:6, border:'1px solid #CCCCCC', background:'#F5F5F5', color:'#CCCCCC', fontSize:12, cursor:'pointer' }}>✕</button>
              </div>

              <div style={{ marginBottom:16 }}>
                <label className="field-label">Wallet Address</label>
                <input className="field-input" type="text" placeholder={addingChain.placeholder} value={newAddr} onChange={e => setNewAddr(e.target.value)} autoFocus />
              </div>
              <div style={{ marginBottom:20 }}>
                <label className="field-label">Label (optional)</label>
                <input className="field-input" type="text" placeholder={`e.g. My ${addingChain.label}`} value={newLabel} onChange={e => setNewLabel(e.target.value)} />
              </div>
              <button className="btn-primary" onClick={handleAdd} disabled={saving || !newAddr.trim()}>
                {saving ? <span className="spinner" style={{width:16,height:16,borderColor:'rgba(255,255,255,0.3)',borderTopColor:'#fff'}} /> : null}
                {saving ? 'Saving…' : 'Add Wallet'}
              </button>
            </div>
          )}

          {/* Privacy note */}
          <div style={{ background:'rgba(75,83,32,0.06)', border:'1px solid rgba(75,83,32,0.15)', borderRadius:8, padding:'12px 16px', marginBottom:24 }}>
            <div style={{ fontSize:13, color:'#4B5320', fontWeight:600, marginBottom:3 }}>🔒 Privacy</div>
            <div style={{ fontSize:12, color:'#6B7B3A', lineHeight:'18px' }}>Addresses are only shown to group members when settling up. We never store private keys.</div>
          </div>

        </div>
      )}
    </div>
  );
}
