import React, { useState } from 'react';
import useAppStore from '../store/appStore.js';

const CURRENCIES = ['USD','EUR','GBP','RUB','UAH','TRY','AED','IDR'];

const inp = {
  width:'100%', height:50, background:'rgba(255,255,255,0.05)',
  border:'1px solid rgba(255,255,255,0.10)', borderRadius:14, padding:'0 14px',
  color:'#e8eeff', fontSize:15, fontWeight:500, outline:'none', boxSizing:'border-box',
};

export default function CreateGroup({ onNavigate, onToast }) {
  const { createGroup, paymentStatus, groups } = useAppStore();
  const [form, setForm] = useState({ name:'', description:'', currency:'EUR' });
  const [submitting, setSubmitting] = useState(false);
  const isAtFreeLimit = !paymentStatus?.isPro && groups.length >= 3;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { onToast('Group name is required', 'error'); return; }
    setSubmitting(true);
    try {
      const group = await createGroup(form);
      onToast(`"${group.name}" created! 🎉`);
      onNavigate('group-detail');
    } catch (err) {
      err.code === 'FREE_LIMIT_REACHED' ? onNavigate('pro') : onToast(err.message, 'error');
    } finally { setSubmitting(false); }
  };

  const base = { minHeight:'100vh', background:'linear-gradient(180deg,#060818 0%,#0a0f2e 40%,#060818 100%)', paddingBottom:40, position:'relative', overflow:'hidden' };

  if (isAtFreeLimit) return (
    <div style={base}>
      <div style={{ position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)', width:340, height:340, background:'radial-gradient(circle,rgba(245,176,30,0.1) 0%,transparent 65%)', borderRadius:'50%', pointerEvents:'none' }} />
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'20px 16px', position:'relative', zIndex:1 }}>
        <button onClick={() => onNavigate('groups')} style={{ width:36, height:36, borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'#a0b0e0', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
        <h1 style={{ fontSize:20, fontWeight:900, color:'#fff' }}>Create Group</h1>
      </div>
      <div style={{ textAlign:'center', padding:'60px 32px', position:'relative', zIndex:1 }}>
        <div style={{ fontSize:64, marginBottom:20, filter:'drop-shadow(0 0 20px rgba(245,176,30,0.5))' }}>🔒</div>
        <h2 style={{ fontSize:22, fontWeight:900, color:'#f5c842', marginBottom:12 }}>Free Plan Limit</h2>
        <p style={{ fontSize:14, color:'#6070a0', lineHeight:1.7, marginBottom:28 }}>You've used all 3 free groups.<br/>Upgrade to Pro for unlimited groups.</p>
        <button onClick={() => onNavigate('pro')} style={{ width:'100%', height:56, background:'linear-gradient(135deg,#c4830a,#f5b820,#ffd060,#f5b820)', border:'none', borderRadius:18, fontSize:16, fontWeight:900, color:'#1a0a00', cursor:'pointer', boxShadow:'0 4px 20px rgba(245,176,30,0.4)' }}>
          ⭐ Upgrade to Pro
        </button>
      </div>
    </div>
  );

  return (
    <div style={base}>
      <style>{`.form-inp:focus{border-color:rgba(79,142,247,0.5)!important;background:rgba(79,142,247,0.08)!important;}`}</style>
      <div style={{ position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)', width:340, height:340, background:'radial-gradient(circle,rgba(59,110,246,0.13) 0%,transparent 65%)', borderRadius:'50%', pointerEvents:'none' }} />

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'20px 16px 20px', position:'relative', zIndex:1 }}>
        <button onClick={() => onNavigate('groups')} style={{ width:36, height:36, borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'#a0b0e0', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>‹</button>
        <div>
          <h1 style={{ fontSize:20, fontWeight:900, color:'#fff', letterSpacing:-0.3 }}>New Group</h1>
          <p style={{ fontSize:12, color:'#4a5080' }}>Set up a shared expense group</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ padding:'0 16px', position:'relative', zIndex:1 }}>
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, display:'block', marginBottom:8 }}>Group Name *</label>
          <input className="form-inp" style={inp} type="text" placeholder="e.g. Bali Trip, Flat Expenses…" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} maxLength={50} autoFocus />
        </div>

        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, display:'block', marginBottom:8 }}>Description</label>
          <input className="form-inp" style={inp} type="text" placeholder="What's this group for? (optional)" value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} maxLength={200} />
        </div>

        <div style={{ marginBottom:28 }}>
          <label style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, display:'block', marginBottom:10 }}>Default Currency</label>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            {CURRENCIES.map(c => {
              const active = form.currency === c;
              return (
                <button key={c} type="button" onClick={() => setForm(p=>({...p,currency:c}))} style={{
                  height:44, borderRadius:12, border: active ? '1.5px solid rgba(79,142,247,0.6)' : '1px solid rgba(255,255,255,0.08)',
                  background: active ? 'linear-gradient(135deg,rgba(79,142,247,0.2),rgba(106,94,247,0.15))' : 'rgba(255,255,255,0.04)',
                  color: active ? '#7ab4ff' : '#4a5080', fontSize:13, fontWeight:700, cursor:'pointer', transition:'all 0.15s',
                  boxShadow: active ? '0 0 14px rgba(79,142,247,0.2)' : 'none',
                }}>{c}</button>
              );
            })}
          </div>
        </div>

        <button type="submit" disabled={submitting} style={{
          width:'100%', height:56, background: submitting ? 'rgba(79,142,247,0.3)' : 'linear-gradient(135deg,#4f8ef7,#6a5ef7)',
          border:'none', borderRadius:18, fontSize:16, fontWeight:800, color:'#fff', cursor:'pointer',
          boxShadow: submitting ? 'none' : '0 4px 20px rgba(79,142,247,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
          transition:'all 0.2s',
        }}>
          {submitting ? '⏳ Creating…' : 'Create Group 🚀'}
        </button>

        {!paymentStatus?.isPro && (
          <p style={{ textAlign:'center', fontSize:12, color:'#3d4870', marginTop:14 }}>
            Free plan: {groups.length}/3 groups ·{' '}
            <span style={{ color:'#f5c842', cursor:'pointer', fontWeight:600 }} onClick={() => onNavigate('pro')}>Upgrade for unlimited →</span>
          </p>
        )}
      </form>
    </div>
  );
}
