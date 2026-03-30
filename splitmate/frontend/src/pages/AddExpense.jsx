import React, { useState, useEffect, useRef } from 'react';
import useAppStore from '../store/appStore.js';
import api from '../utils/api.js';

const CATEGORIES = [
  { value: 'food',          label: '🍕', name: 'Food' },
  { value: 'transport',     label: '🚗', name: 'Transport' },
  { value: 'accommodation', label: '🏨', name: 'Hotel' },
  { value: 'entertainment', label: '🎬', name: 'Fun' },
  { value: 'shopping',      label: '🛍️', name: 'Shop' },
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
    if (draftExpenseForm) return draftExpenseForm;
    return {
      description: '', amount: '',
      currency: activeGroup?.currency || 'USD',
      category: 'general', paidBy: user?.id?.toString() || '',
      splitType: 'equal',
      isRecurring: false, recurInterval: 'monthly',
    };
  });
  const [splitData, setSplitData]   = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning]     = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!activeGroup) return;
    api.groups.get(activeGroup.id).then(({ members }) => {
      setMembers(members);
      // Init split data for all members
      setSplitData(members.map(m => ({ userId: m.telegram_id.toString(), name: m.full_name, percentage: Math.floor(100 / members.length), shares: 1, amount: '' })));
    });
    api.payments.currencies().then(({ currencies }) => setCurrencies(currencies));
  }, [activeGroup]);

  const set = (field, value) => setForm(p => ({ ...p, [field]: value }));

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleScanReceipt = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!paymentStatus?.isPro) { setDraftExpenseForm(form); onNavigate('pro'); return; }
    setScanning(true); setScanResult(null);
    try {
      const base64 = await fileToBase64(file);
      const { data } = await api.receipts.scan(base64, file.type || 'image/jpeg');
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
    } finally { setScanning(false); e.target.value = ''; }
  };

  // Validate custom / percentage splits sum
  const validateSplits = () => {
    if (form.splitType === 'percentage') {
      const total = splitData.reduce((s, d) => s + (parseFloat(d.percentage) || 0), 0);
      if (Math.abs(total - 100) > 0.5) { onToast(`Percentages must add up to 100% (currently ${total.toFixed(1)}%)`, 'error'); return false; }
    }
    if (form.splitType === 'custom') {
      const total = splitData.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
      const expAmount = parseFloat(form.amount) || 0;
      if (Math.abs(total - expAmount) > 0.01) { onToast(`Custom amounts must add up to ${expAmount} (currently ${total.toFixed(2)})`, 'error'); return false; }
    }
    return true;
  };

  const buildSplitData = () => {
    if (form.splitType === 'equal') return null;
    return splitData.map(d => ({
      userId: d.userId,
      ...(form.splitType === 'percentage' ? { percentage: parseFloat(d.percentage) || 0 } : {}),
      ...(form.splitType === 'custom'     ? { amount: parseFloat(d.amount) || 0 } : {}),
      ...(form.splitType === 'shares'     ? { shares: parseFloat(d.shares) || 1 } : {}),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim() || !form.amount) { onToast('Fill in description and amount', 'error'); return; }
    if (isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) { onToast('Amount must be positive', 'error'); return; }
    if (!validateSplits()) return;

    setSubmitting(true);
    try {
      await addExpense({
        groupId:       activeGroup.id,
        description:   form.description.trim(),
        amount:        parseFloat(form.amount),
        currency:      form.currency,
        category:      form.category,
        splitType:     form.splitType,
        splitData:     buildSplitData(),
        paidBy:        parseInt(form.paidBy, 10),
        isRecurring:   form.isRecurring,
        recurInterval: form.recurInterval,
      });
      clearDraftExpenseForm();
      onToast(form.isRecurring ? `Expense added! 🔄 Repeats ${form.recurInterval}` : 'Expense added! 💸');
      onNavigate('group-detail');
    } catch (err) {
      err.code === 'PRO_REQUIRED' ? (setDraftExpenseForm(form), onNavigate('pro')) : onToast(err.message, 'error');
    } finally { setSubmitting(false); }
  };

  if (!activeGroup) { onNavigate('groups'); return null; }

  const isPro = paymentStatus?.isPro;
  const SPLIT_TYPES = [
    { value: 'equal',      label: '⚖️ Equal' },
    { value: 'percentage', label: '% Split' },
    { value: 'custom',     label: '✏️ Exact' },
    { value: 'shares',     label: '🔢 Shares' },
  ];

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#060818 0%,#0a0f2e 40%,#060818 100%)', paddingBottom:40, position:'relative', overflow:'hidden' }}>
      <style>{`
        .form-inp:focus{border-color:rgba(79,142,247,0.5)!important;background:rgba(79,142,247,0.08)!important;}
        .cat-btn:active{transform:scale(0.93);}
        .split-opt:active{transform:scale(0.96);}
        .scan-btn:active{transform:scale(0.97);}
        .recur-toggle:active{transform:scale(0.97);}
      `}</style>
      <div style={{ position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)', width:340, height:340, background:'radial-gradient(circle,rgba(59,110,246,0.13) 0%,transparent 65%)', borderRadius:'50%', pointerEvents:'none' }} />

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px 20px', position:'relative', zIndex:1 }}>
        <button onClick={() => { clearDraftExpenseForm(); onNavigate('group-detail'); }} style={{ width:36, height:36, borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'#a0b0e0', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:20, fontWeight:900, color:'#fff', letterSpacing:-0.3 }}>Add Expense</h1>
          <p style={{ fontSize:12, color:'#4a5080' }}>{activeGroup.name}</p>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={handleScanReceipt} />
        <button type="button" className="scan-btn" onClick={() => fileInputRef.current?.click()} disabled={scanning}
          style={{ height:36, padding:'0 14px', borderRadius:12, border:'1px solid rgba(245,176,30,0.3)', background: scanning ? 'rgba(245,176,30,0.05)' : 'rgba(245,176,30,0.1)', color: scanning ? '#7a6020' : '#f5b01e', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6, transition:'all 0.2s' }}>
          {scanning ? '⏳' : '📷'} {scanning ? 'Scanning…' : 'Scan'}{!isPro && ' ⭐'}
        </button>
      </div>

      {scanResult && (
        <div style={{ margin:'0 16px 16px', padding:'12px 16px', borderRadius:14, background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', position:'relative', zIndex:1 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#22c55e', marginBottom:6 }}>✅ Receipt scanned</div>
          {scanResult.items?.slice(0,3).map((item, i) => (
            <div key={i} style={{ fontSize:12, color:'#4a7060' }}>{item.name} — {scanResult.currency} {item.amount}</div>
          ))}
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
            <input className="form-inp" style={inp} type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} />
          </div>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, display:'block', marginBottom:8 }}>Currency</label>
            <select className="form-inp" style={{ ...inp, padding:'0 10px', appearance:'none' }} value={form.currency} onChange={e => set('currency', e.target.value)}>
              {currencies.map(c => <option key={c.code} value={c.code} style={{ background:'#0a0f2e' }}>{c.code}</option>)}
            </select>
          </div>
        </div>

        {/* Category */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, display:'block', marginBottom:10 }}>Category</label>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            {CATEGORIES.map(cat => {
              const active = form.category === cat.value;
              return (
                <button key={cat.value} type="button" className="cat-btn"
                  onClick={() => set('category', cat.value)}
                  style={{ padding:'10px 4px', borderRadius:12, border: active ? '1px solid rgba(79,142,247,0.5)' : '1px solid rgba(255,255,255,0.07)', background: active ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.03)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:4, transition:'all 0.15s' }}>
                  <span style={{ fontSize:20 }}>{cat.label}</span>
                  <span style={{ fontSize:10, color: active ? '#7ab4ff' : '#4a5080', fontWeight:600 }}>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Paid By */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, display:'block', marginBottom:8 }}>Paid by</label>
          <select className="form-inp" style={{ ...inp, padding:'0 14px', appearance:'none' }} value={form.paidBy} onChange={e => set('paidBy', e.target.value)}>
            {members.map(m => <option key={m.telegram_id} value={m.telegram_id.toString()} style={{ background:'#0a0f2e' }}>{m.full_name}{Number(m.telegram_id) === Number(user?.id) ? ' (you)' : ''}</option>)}
          </select>
        </div>

        {/* Split Type */}
        <div style={{ marginBottom: form.splitType !== 'equal' ? 16 : 20 }}>
          <label style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, display:'block', marginBottom:10 }}>
            Split Method {!isPro && <span style={{ color:'#f5b01e' }}>⭐ Pro for custom splits</span>}
          </label>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            {SPLIT_TYPES.map(st => {
              const active = form.splitType === st.value;
              const needsPro = st.value !== 'equal' && !isPro;
              return (
                <button key={st.value} type="button" className="split-opt"
                  onClick={() => { if (needsPro) { setDraftExpenseForm(form); onNavigate('pro'); return; } set('splitType', st.value); }}
                  style={{ padding:'10px 4px', borderRadius:12, border: active ? '1px solid rgba(79,142,247,0.5)' : '1px solid rgba(255,255,255,0.07)', background: active ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.03)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:4, transition:'all 0.15s', opacity: needsPro ? 0.6 : 1 }}>
                  <span style={{ fontSize:11, color: active ? '#7ab4ff' : '#5060a0', fontWeight:700 }}>{st.label}</span>
                  {needsPro && <span style={{ fontSize:9, color:'#f5b01e' }}>PRO</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom split inputs */}
        {form.splitType !== 'equal' && members.length > 0 && (
          <div style={{ marginBottom:20, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'12px 14px' }}>
            <div style={{ fontSize:12, color:'#4a5080', marginBottom:12, fontWeight:600 }}>
              {form.splitType === 'percentage' && '% per person (must total 100)'}
              {form.splitType === 'custom'     && 'Exact amount per person'}
              {form.splitType === 'shares'     && 'Shares per person (proportional)'}
            </div>
            {splitData.map((d, i) => (
              <div key={d.userId} style={{ display:'flex', alignItems:'center', gap:10, marginBottom: i < splitData.length-1 ? 10 : 0 }}>
                <span style={{ flex:1, fontSize:13, color:'#a0b0d0', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.name}</span>
                {form.splitType === 'percentage' && (
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <input type="number" min="0" max="100" step="1"
                      value={d.percentage}
                      onChange={e => setSplitData(prev => prev.map((p, j) => j === i ? { ...p, percentage: e.target.value } : p))}
                      style={{ ...inp, width:70, height:38, fontSize:14, textAlign:'right', padding:'0 8px' }} />
                    <span style={{ color:'#4a5080', fontSize:14 }}>%</span>
                  </div>
                )}
                {form.splitType === 'custom' && (
                  <input type="number" min="0" step="0.01"
                    placeholder="0.00"
                    value={d.amount}
                    onChange={e => setSplitData(prev => prev.map((p, j) => j === i ? { ...p, amount: e.target.value } : p))}
                    style={{ ...inp, width:90, height:38, fontSize:14, textAlign:'right', padding:'0 8px' }} />
                )}
                {form.splitType === 'shares' && (
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <button type="button" onClick={() => setSplitData(prev => prev.map((p, j) => j === i ? { ...p, shares: Math.max(1, (parseFloat(p.shares)||1) - 1) } : p))} style={{ width:28, height:28, borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'#a0b0e0', fontSize:16, cursor:'pointer' }}>−</button>
                    <span style={{ width:28, textAlign:'center', color:'#e8eeff', fontSize:14, fontWeight:700 }}>{d.shares}</span>
                    <button type="button" onClick={() => setSplitData(prev => prev.map((p, j) => j === i ? { ...p, shares: (parseFloat(p.shares)||1) + 1 } : p))} style={{ width:28, height:28, borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'#a0b0e0', fontSize:16, cursor:'pointer' }}>+</button>
                  </div>
                )}
              </div>
            ))}
            {/* Totals hint */}
            {form.splitType === 'percentage' && (
              <div style={{ marginTop:10, fontSize:11, color: Math.abs(splitData.reduce((s,d)=>s+(parseFloat(d.percentage)||0),0)-100) < 0.5 ? '#22c55e' : '#f05252', fontWeight:600 }}>
                Total: {splitData.reduce((s,d)=>s+(parseFloat(d.percentage)||0),0).toFixed(0)}% / 100%
              </div>
            )}
            {form.splitType === 'custom' && (
              <div style={{ marginTop:10, fontSize:11, color: Math.abs(splitData.reduce((s,d)=>s+(parseFloat(d.amount)||0),0) - (parseFloat(form.amount)||0)) < 0.01 ? '#22c55e' : '#f05252', fontWeight:600 }}>
                Total: {splitData.reduce((s,d)=>s+(parseFloat(d.amount)||0),0).toFixed(2)} / {parseFloat(form.amount||0).toFixed(2)}
              </div>
            )}
          </div>
        )}

        {/* Recurring toggle */}
        <div style={{ marginBottom:20, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'14px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'#c8d0f0' }}>🔄 Recurring expense</div>
              <div style={{ fontSize:11, color:'#4a5080', marginTop:2 }}>Auto-repeats on schedule {!isPro && '• ⭐ Pro'}</div>
            </div>
            <button type="button" className="recur-toggle"
              onClick={() => { if (!isPro) { setDraftExpenseForm(form); onNavigate('pro'); return; } set('isRecurring', !form.isRecurring); }}
              style={{ width:48, height:26, borderRadius:13, border:'none', cursor:'pointer', position:'relative', background: form.isRecurring ? 'linear-gradient(135deg,#4f8ef7,#6a5ef7)' : 'rgba(255,255,255,0.1)', transition:'all 0.2s' }}>
              <div style={{ position:'absolute', top:3, left: form.isRecurring ? 24 : 3, width:20, height:20, borderRadius:10, background:'#fff', transition:'left 0.2s' }} />
            </button>
          </div>
          {form.isRecurring && (
            <div style={{ marginTop:14, display:'flex', gap:10 }}>
              {['weekly','monthly'].map(interval => (
                <button key={interval} type="button"
                  onClick={() => set('recurInterval', interval)}
                  style={{ flex:1, height:38, borderRadius:10, border: form.recurInterval === interval ? '1px solid rgba(79,142,247,0.5)' : '1px solid rgba(255,255,255,0.07)', background: form.recurInterval === interval ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.03)', color: form.recurInterval === interval ? '#7ab4ff' : '#4a5080', fontSize:13, fontWeight:700, cursor:'pointer', transition:'all 0.15s', textTransform:'capitalize' }}>
                  {interval === 'weekly' ? '📅 Weekly' : '📆 Monthly'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button type="submit" disabled={submitting}
          style={{ width:'100%', height:56, borderRadius:18, border:'none', background: submitting ? 'rgba(79,142,247,0.4)' : 'linear-gradient(135deg,#4f8ef7 0%,#6a5ef7 100%)', color:'#fff', fontSize:17, fontWeight:800, cursor: submitting ? 'not-allowed' : 'pointer', boxShadow:'0 4px 20px rgba(79,142,247,0.4)', letterSpacing:0.2, transition:'all 0.2s' }}>
          {submitting ? '⏳ Adding…' : `💸 Add Expense`}
        </button>
      </form>
    </div>
  );
}
