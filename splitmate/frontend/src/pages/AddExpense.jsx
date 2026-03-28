import React, { useState, useEffect } from 'react';
import useAppStore from '../store/appStore.js';
import api from '../utils/api.js';

const CATEGORIES = [
  { value: 'food',          label: '🍕', name: 'Food' },
  { value: 'transport',     label: '🚗', name: 'Transport' },
  { value: 'accommodation', label: '🏨', name: 'Hotel' },
  { value: 'entertainment', label: '🎬', name: 'Fun' },
  { value: 'shopping',      label: '🛍️', name: 'Shopping' },
  { value: 'health',        label: '💊', name: 'Health' },
  { value: 'utilities',     label: '💡', name: 'Bills' },
  { value: 'general',       label: '💰', name: 'General' },
];

const inp = {
  width: '100%', height: 50,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 14, padding: '0 14px',
  color: '#e8eeff', fontSize: 15, fontWeight: 500,
  outline: 'none', boxSizing: 'border-box',
};

export default function AddExpense({ onNavigate, onToast }) {
  const { activeGroup, user, addExpense, paymentStatus } = useAppStore();
  const [members, setMembers]       = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [form, setForm] = useState({
    description: '', amount: '',
    currency: activeGroup?.currency || 'USD',
    category: 'general', paidBy: user?.id?.toString() || '', splitType: 'equal',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!activeGroup) return;
    api.groups.get(activeGroup.id).then(({ members }) => setMembers(members));
    api.payments.currencies().then(({ currencies }) => setCurrencies(currencies));
  }, [activeGroup]);

  const set = (field, value) => setForm(p => ({ ...p, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim() || !form.amount) { onToast('Fill in description and amount', 'error'); return; }
    if (isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) { onToast('Amount must be positive', 'error'); return; }
    setSubmitting(true);
    try {
      await addExpense({ groupId: activeGroup.id, description: form.description.trim(), amount: parseFloat(form.amount), currency: form.currency, category: form.category, splitType: form.splitType, paidBy: parseInt(form.paidBy, 10) });
      onToast('Expense added! 💸');
      onNavigate('group-detail');
    } catch (err) {
      err.code === 'PRO_REQUIRED' ? onNavigate('pro') : onToast(err.message, 'error');
    } finally { setSubmitting(false); }
  };

  if (!activeGroup) { onNavigate('groups'); return null; }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#060818 0%,#0a0f2e 40%,#060818 100%)', paddingBottom:40, position:'relative', overflow:'hidden' }}>
      <style>{`.form-inp:focus{border-color:rgba(79,142,247,0.5)!important;background:rgba(79,142,247,0.08)!important;} .cat-btn:active{transform:scale(0.93);} .split-opt:active{transform:scale(0.96);}`}</style>
      <div style={{ position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)', width:340, height:340, background:'radial-gradient(circle,rgba(59,110,246,0.13) 0%,transparent 65%)', borderRadius:'50%', pointerEvents:'none' }} />

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'20px 16px 20px', position:'relative', zIndex:1 }}>
        <button onClick={() => onNavigate('group-detail')} style={{ width:36, height:36, borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'#a0b0e0', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>‹</button>
        <div>
          <h1 style={{ fontSize:20, fontWeight:900, color:'#fff', letterSpacing:-0.3 }}>Add Expense</h1>
          <p style={{ fontSize:12, color:'#4a5080' }}>{activeGroup.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ padding:'0 16px', position:'relative', zIndex:1 }}>

        {/* Description */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, display:'block', marginBottom:8 }}>What was it for?</label>
          <input className="form-inp" style={inp} type="text" placeholder="e.g. Dinner, Uber, Hotel…" value={form.description} onChange={e => set('description', e.target.value)} maxLength={200} autoFocus />
        </div>

        {/* Amount + Currency */}
        <div style={{ display:'flex', gap:10, marginBottom:16 }}>
          <div style={{ flex:2 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, display:'block', marginBottom:8 }}>Amount</label>
            <input className="form-inp" style={inp} type="number" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} min="0.01" step="0.01" inputMode="decimal" />
          </div>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, display:'block', marginBottom:8 }}>Currency</label>
            <select className="form-inp" style={{ ...inp, padding:'0 10px', appearance:'none' }} value={form.currency} onChange={e => set('currency', e.target.value)}>
              {currencies.map(c => <option key={c.code} value={c.code} style={{ background:'#0a0f2e' }}>{c.code}</option>)}
            </select>
            {!paymentStatus?.isPro && <div style={{ fontSize:10, color:'#4a3800', marginTop:4 }}>⭐ Pro for multi-currency</div>}
          </div>
        </div>

        {/* Category grid */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, display:'block', marginBottom:10 }}>Category</label>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            {CATEGORIES.map(cat => {
              const active = form.category === cat.value;
              return (
                <button key={cat.value} type="button" className="cat-btn" onClick={() => set('category', cat.value)} style={{
                  height:64, borderRadius:14, border: active ? '1.5px solid rgba(79,142,247,0.6)' : '1px solid rgba(255,255,255,0.08)',
                  background: active ? 'linear-gradient(135deg,rgba(79,142,247,0.2),rgba(106,94,247,0.15))' : 'rgba(255,255,255,0.04)',
                  cursor:'pointer', transition:'all 0.15s', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4,
                  boxShadow: active ? '0 0 16px rgba(79,142,247,0.2)' : 'none',
                }}>
                  <span style={{ fontSize:22 }}>{cat.label}</span>
                  <span style={{ fontSize:10, fontWeight:700, color: active ? '#7ab4ff' : '#3d4870', letterSpacing:0.3 }}>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Paid by */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, display:'block', marginBottom:8 }}>Paid by</label>
          <select className="form-inp" style={{ ...inp, padding:'0 14px', appearance:'none', width:'100%' }} value={form.paidBy} onChange={e => set('paidBy', e.target.value)}>
            {members.map(m => <option key={m.telegram_id} value={m.telegram_id} style={{ background:'#0a0f2e' }}>{m.telegram_id === user?.id ? 'You' : m.full_name}</option>)}
          </select>
        </div>

        {/* Split method */}
        <div style={{ marginBottom:24 }}>
          <label style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, display:'block', marginBottom:10 }}>
            Split method
          </label>
          <div style={{ display:'flex', gap:8 }}>
            {[
              { key:'equal', label:'÷ Equal', pro:false },
              { key:'custom', label:'# Custom', pro:true },
              { key:'percentage', label:'% Percent', pro:true },
            ].map(opt => {
              const active = form.splitType === opt.key;
              const locked = opt.pro && !paymentStatus?.isPro;
              return (
                <button key={opt.key} type="button" className="split-opt"
                  onClick={() => locked ? onNavigate('pro') : set('splitType', opt.key)}
                  style={{
                    flex:1, height:44, borderRadius:12,
                    border: active ? '1.5px solid rgba(79,142,247,0.6)' : '1px solid rgba(255,255,255,0.08)',
                    background: active ? 'linear-gradient(135deg,rgba(79,142,247,0.2),rgba(106,94,247,0.15))' : 'rgba(255,255,255,0.04)',
                    color: active ? '#7ab4ff' : locked ? '#2a3060' : '#6070a0',
                    fontSize:12, fontWeight:700, cursor:'pointer', transition:'all 0.15s',
                  }}>
                  {opt.label}{locked && ' ⭐'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <button type="submit" disabled={submitting} style={{
          width:'100%', height:56,
          background: submitting ? 'rgba(79,142,247,0.3)' : 'linear-gradient(135deg,#4f8ef7,#6a5ef7)',
          border:'none', borderRadius:18,
          fontSize:16, fontWeight:800, color:'#fff', cursor:'pointer', letterSpacing:0.2,
          boxShadow: submitting ? 'none' : '0 4px 20px rgba(79,142,247,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
          transition:'all 0.2s',
        }}>
          {submitting ? '⏳ Adding…' : 'Add Expense 💸'}
        </button>
      </form>
    </div>
  );
}
