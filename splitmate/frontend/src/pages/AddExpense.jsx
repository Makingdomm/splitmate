import React, { useState, useEffect, useRef } from 'react';
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
  const { activeGroup, user, addExpense, paymentStatus, draftExpenseForm, setDraftExpenseForm, clearDraftExpenseForm } = useAppStore();
  const [members, setMembers]       = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [form, setForm] = useState(() => {
    // Restore draft if it exists (user came back from Pro page)
    if (draftExpenseForm) return draftExpenseForm;
    return {
      description: '', amount: '',
      currency: activeGroup?.currency || 'USD',
      category: 'general', paidBy: user?.id?.toString() || '', splitType: 'equal',
    };
  });
  const [submitting, setSubmitting]   = useState(false);
  const [scanning, setScanning]       = useState(false);
  const [scanResult, setScanResult]   = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!activeGroup) return;
    api.groups.get(activeGroup.id).then(({ members }) => setMembers(members));
    api.payments.currencies().then(({ currencies }) => setCurrencies(currencies));
  }, [activeGroup]);

  const set = (field, value) => setForm(p => ({ ...p, [field]: value }));

  // Convert file to base64
  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleScanReceipt = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check Pro
    if (!paymentStatus?.isPro) { setDraftExpenseForm(form); onNavigate('pro'); return; }

    setScanning(true);
    setScanResult(null);
    try {
      const base64 = await fileToBase64(file);
      const mimeType = file.type || 'image/jpeg';
      const { data } = await api.receipts.scan(base64, mimeType);

      // Auto-fill form
      setForm(prev => ({
        ...prev,
        description: data.merchant || prev.description,
        amount: data.total ? data.total.toString() : prev.amount,
        currency: data.currency || prev.currency,
        category: data.category || prev.category,
      }));
      setScanResult(data);
      onToast(`✅ Receipt scanned — ${data.merchant || 'details filled in'}!`);
    } catch (err) {
      if (err.code === 'PRO_REQUIRED') { setDraftExpenseForm(form); onNavigate('pro'); return; }
      onToast(err.message || 'Could not read receipt. Try a clearer photo.', 'error');
    } finally {
      setScanning(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim() || !form.amount) { onToast('Fill in description and amount', 'error'); return; }
    if (isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) { onToast('Amount must be positive', 'error'); return; }
    setSubmitting(true);
    try {
      await addExpense({ groupId: activeGroup.id, description: form.description.trim(), amount: parseFloat(form.amount), currency: form.currency, category: form.category, splitType: form.splitType, paidBy: parseInt(form.paidBy, 10) });
      clearDraftExpenseForm();
      onToast('Expense added! 💸');
      onNavigate('group-detail');
    } catch (err) {
      err.code === 'PRO_REQUIRED' ? (setDraftExpenseForm(form), onNavigate('pro')) : onToast(err.message, 'error');
    } finally { setSubmitting(false); }
  };

  if (!activeGroup) { onNavigate('groups'); return null; }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#060818 0%,#0a0f2e 40%,#060818 100%)', paddingBottom:40, position:'relative', overflow:'hidden' }}>
      <style>{`.form-inp:focus{border-color:rgba(79,142,247,0.5)!important;background:rgba(79,142,247,0.08)!important;} .cat-btn:active{transform:scale(0.93);} .split-opt:active{transform:scale(0.96);} .scan-btn:active{transform:scale(0.97);}`}</style>
      <div style={{ position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)', width:340, height:340, background:'radial-gradient(circle,rgba(59,110,246,0.13) 0%,transparent 65%)', borderRadius:'50%', pointerEvents:'none' }} />

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'20px 16px 20px', position:'relative', zIndex:1 }}>
        <button onClick={() => { clearDraftExpenseForm(); onNavigate('group-detail'); }} style={{ width:36, height:36, borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'#a0b0e0', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>‹</button>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:20, fontWeight:900, color:'#fff', letterSpacing:-0.3 }}>Add Expense</h1>
          <p style={{ fontSize:12, color:'#4a5080' }}>{activeGroup.name}</p>
        </div>
        {/* Scan Receipt button */}
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={handleScanReceipt} />
        <button
          type="button"
          className="scan-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={scanning}
          style={{
            height:36, padding:'0 14px', borderRadius:12,
            border:'1px solid rgba(245,176,30,0.3)',
            background: scanning ? 'rgba(245,176,30,0.05)' : 'rgba(245,176,30,0.1)',
            color: scanning ? '#7a6020' : '#f5b01e',
            fontSize:12, fontWeight:700, cursor:'pointer',
            display:'flex', alignItems:'center', gap:6, flexShrink:0,
            transition:'all 0.2s',
          }}
        >
          {scanning ? '⏳' : '📷'} {scanning ? 'Scanning…' : 'Scan'}{!paymentStatus?.isPro && ' ⭐'}
        </button>
      </div>

      {/* Scan result preview */}
      {scanResult && (
        <div style={{ margin:'0 16px 16px', padding:'12px 16px', borderRadius:14, background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', position:'relative', zIndex:1 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#22c55e', marginBottom:6 }}>✅ Receipt scanned</div>
          {scanResult.items?.length > 0 && (
            <div style={{ fontSize:12, color:'#4a7060' }}>
              {scanResult.items.slice(0,3).map((item, i) => (
                <div key={i}>{item.name} — {scanResult.currency} {item.amount}</div>
              ))}
              {scanResult.items.length > 3 && <div>+{scanResult.items.length - 3} more items</div>}
            </div>
          )}
          <div style={{ fontSize:11, color:'#2a4030', marginTop:4 }}>
            Confidence: {Math.round((scanResult.confidence || 0) * 100)}%
            {scanResult.date && ` · ${scanResult.date}`}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ padding:'0 16px', position:'relative', zIndex:1 }}>

        {/* Description */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, display:'block', marginBottom:8 }}>What was it for?</label>
          <input className="form-inp" style={inp} type="text" placeholder="e.g. Dinner, Uber, Hotel…" value={form.description} onChange={e => set('description', e.target.value)} maxLength={200} />
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
          <label style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, display:'block', marginBottom:10 }}>Split method</label>
          <div style={{ display:'flex', gap:8 }}>
            {[
              { key:'equal',      label:'÷ Equal',   pro:false },
              { key:'custom',     label:'# Custom',  pro:true },
              { key:'percentage', label:'% Percent', pro:true },
            ].map(opt => {
              const active = form.splitType === opt.key;
              const locked = opt.pro && !paymentStatus?.isPro;
              return (
                <button key={opt.key} type="button" className="split-opt"
                  onClick={() => locked ? (setDraftExpenseForm(form), onNavigate('pro')) : set('splitType', opt.key)}
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
