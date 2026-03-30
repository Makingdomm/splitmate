import React, { useState, useEffect, useRef } from 'react';
import useAppStore from '../store/appStore.js';
import api from '../utils/api.js';
import { CatIcons } from '../components/Icons.jsx';

const CATEGORIES = [
  { value: 'food',          name: 'Food' },
  { value: 'transport',     name: 'Transport' },
  { value: 'accommodation', name: 'Hotel' },
  { value: 'entertainment', name: 'Fun' },
  { value: 'shopping', name: 'Shop' },
  { value: 'health', name: 'Health' },
  { value: 'utilities', name: 'Bills' },
  { value: 'general', name: 'Other' },
];

const SPLIT_TYPES = [
  { value: 'equal',      label: '⚖️ Equal' },
  { value: 'percentage', label: '% Percent' },
  { value: 'custom',     label: '✏️ Exact' },
  { value: 'shares',     label: '🔢 Shares' },
];

export default function AddExpense({ onNavigate, onToast }) {
  const { activeGroup, user, addExpense, paymentStatus, draftExpenseForm, setDraftExpenseForm, clearDraftExpenseForm } = useAppStore();
  const [members, setMembers] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [form, setForm] = useState(() => draftExpenseForm || {
    description: '', amount: '',
    currency: activeGroup?.currency || 'USD',
    category: 'general', paidBy: user?.id?.toString() || '',
    splitType: 'equal', isRecurring: false, recurInterval: 'monthly',
  });
  const [splitData, setSplitData] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!activeGroup) return;
    api.groups.get(activeGroup.id).then(({ members }) => {
      setMembers(members);
      setSplitData(members.map(m => ({ userId: m.telegram_id.toString(), name: m.full_name, percentage: Math.floor(100 / members.length), shares: 1, amount: '' })));
    });
    api.payments.currencies().then(({ currencies }) => setCurrencies(currencies));
  }, [activeGroup]);

  const set = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      // Resize to max 1200px on longest side, compress to JPEG 0.82
      const MAX = 1200;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.82).split(',')[1]);
    };
    img.onerror = reject;
    img.src = url;
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
      onToast(`Receipt scanned: ${data.merchant || 'done'}`);
    } catch (err) {
      if (err.code === 'PRO_REQUIRED') { setDraftExpenseForm(form); onNavigate('pro'); return; }
      onToast(err.message || 'Could not read receipt', 'error');
    } finally { setScanning(false); e.target.value = ''; }
  };

  const validateSplits = () => {
    if (form.splitType === 'percentage') {
      const total = splitData.reduce((s, d) => s + (parseFloat(d.percentage) || 0), 0);
      if (Math.abs(total - 100) > 0.5) { onToast(`Percentages must add to 100% (now ${total.toFixed(1)}%)`, 'error'); return false; }
    }
    if (form.splitType === 'custom') {
      const total = splitData.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
      if (Math.abs(total - (parseFloat(form.amount) || 0)) > 0.01) { onToast(`Custom amounts must add up to ${form.amount}`, 'error'); return false; }
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

  const handleSubmit = async () => {
    if (!form.description.trim() || !form.amount) { onToast('Fill in description and amount', 'error'); return; }
    if (isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) { onToast('Amount must be positive', 'error'); return; }
    if (!validateSplits()) return;
    setSubmitting(true);
    try {
      await addExpense({
        groupId: activeGroup.id,
        description: form.description.trim(),
        amount: parseFloat(form.amount),
        currency: form.currency,
        category: form.category,
        splitType: form.splitType,
        splitData: buildSplitData(),
        paidBy: parseInt(form.paidBy, 10),
        isRecurring: form.isRecurring,
        recurInterval: form.recurInterval,
      });
      clearDraftExpenseForm();
      onToast(form.isRecurring ? 'Recurring expense added!' : 'Expense added!');
      onNavigate('group-detail');
    } catch (err) {
      err.code === 'PRO_REQUIRED' ? (setDraftExpenseForm(form), onNavigate('pro')) : onToast(err.message, 'error');
    } finally { setSubmitting(false); }
  };

  if (!activeGroup) { onNavigate('groups'); return null; }
  const isPro = paymentStatus?.isPro;

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F5', paddingBottom: 40 }}>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleScanReceipt} />

      {/* ── Header — spec §2.11 ── */}
      <div className="page-header">
        <button className="btn-icon" onClick={() => onNavigate('group-detail')} style={{ fontSize: 20, background: '#F5F5F5' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 8L8 12L12 16" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 12H8" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        <div style={{ flex: 1 }}>
          <div className="page-header-title">Add Expense</div>
          <div className="page-header-sub">{activeGroup.name}</div>
        </div>
        {/* Scan Receipt — spec §4.4 haptic on tap */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={scanning}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            height: 36, padding: '0 14px',
            background: isPro ? 'rgba(75,83,32,0.08)' : '#F5F5F5',
            border: `1px solid ${isPro ? '#4B5320' : '#CCCCCC'}`,
            borderRadius: var_md(),
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
            color: isPro ? '#4B5320' : '#CCCCCC',
            fontFamily: 'inherit', transition: 'all 0.12s',
          }}
        >
          {scanning ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : '✨'}
          {scanning ? 'Scanning…' : 'Scan'}
          {!isPro && <span style={{ fontSize: 9, color: '#b8961a', fontWeight: 700 }}>PRO</span>}
        </button>
      </div>

      <div style={{ padding: '24px 24px 0' }}>

        {/* Scan Result Banner */}
        {scanResult && (
          <div className="animate-in" style={{ background: 'rgba(40,167,69,0.08)', border: '1px solid rgba(40,167,69,0.25)', borderRadius: 8, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 12L11 15L16 9" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#28A745', marginBottom: 2 }}>Receipt scanned!</div>
              <div className="list-item-secondary">{scanResult.merchant} · {scanResult.currency} {scanResult.total}</div>
            </div>
            <button onClick={() => setScanResult(null)} style={{ background: 'none', border: 'none', color: '#CCCCCC', fontSize: 14, cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* ── Amount — Display 32px bold ── */}
        <div className="card" style={{ marginBottom: 24, textAlign: 'center' }}>
          <div className="field-label" style={{ textAlign: 'center', marginBottom: 8 }}>Amount</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            {/* Dropdown — spec §2.9 */}
            <select
              value={form.currency}
              onChange={e => set('currency', e.target.value)}
              style={{ height: 52, padding: '0 12px', borderRadius: 4, border: 'none', background: '#F5F5F5', color: '#333', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', outline: 'none', cursor: 'pointer', flexShrink: 0 }}
            >
              {currencies.length > 0
                ? currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)
                : ['USD','EUR','GBP','JPY','CAD','AUD'].map(c => <option key={c} value={c}>{c}</option>)
              }
            </select>
            {/* Amount input — Display 32px bold */}
            <input
              className="field-input amount-input"
              type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*"
              placeholder="0.00"
              value={form.amount}
              onChange={e => {
                let v = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
                const parts = v.split('.');
                if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
                set('amount', v);
              }}
              style={{ flex: 1, maxWidth: 180 }}
            />
          </div>
        </div>

        {/* ── Description ── */}
        <div style={{ marginBottom: 24 }}>
          <label className="field-label">What was it for?</label>
          <input
            className="field-input"
            type="text" placeholder="e.g. Dinner at Mario's…"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            maxLength={200}
          />
        </div>

        {/* ── Category — chip row ── */}
        <div style={{ marginBottom: 24 }}>
          <div className="field-label">Category</div>
          <div className="chip-row">
            {CATEGORIES.map(cat => (
              <button key={cat.value} className={`chip ${form.category === cat.value ? 'active' : ''}`} onClick={() => set('category', cat.value)}>
                <span className="chip-icon" style={{ display:'flex', alignItems:'center' }}>
                  {(() => { const Ico = CatIcons[cat.value] || CatIcons.other; return <Ico />; })()}
                </span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* ── Paid By ── */}
        <div style={{ marginBottom: 24 }}>
          <label className="field-label">Paid by</label>
          <select className="field-select" value={form.paidBy} onChange={e => set('paidBy', e.target.value)}>
            {members.map(m => (
              <option key={m.telegram_id} value={m.telegram_id.toString()}>
                {m.full_name}{Number(m.telegram_id) === Number(user?.id) ? ' (you)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* ── Split Type ── */}
        <div style={{ marginBottom: 24 }}>
          <div className="field-label">Split method</div>
          <div className="tabs">
            {SPLIT_TYPES.map(st => (
              <button key={st.value} className={`tab ${form.splitType === st.value ? 'active' : ''}`} onClick={() => set('splitType', st.value)} style={{ fontSize: 11 }}>
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Custom Split ── */}
        {form.splitType !== 'equal' && (
          <div className="card animate-in" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
            {splitData.map((d, i) => (
              <div key={d.userId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < splitData.length - 1 ? '1px solid #F5F5F5' : 'none' }}>
                <div className="avatar avatar-sm" style={{ background: '#F5F5F5', borderRadius: '50%', fontWeight: 700 }}>
                  {d.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#333' }}>{d.name}</div>
                {form.splitType === 'percentage' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="number" min="0" max="100" value={d.percentage}
                      onChange={e => { const nd = [...splitData]; nd[i].percentage = e.target.value; setSplitData(nd); }}
                      style={{ width: 60, height: 36, borderRadius: 4, border: '1px solid #CCCCCC', background: '#F5F5F5', color: '#333', fontSize: 14, fontWeight: 600, textAlign: 'center', outline: 'none', fontFamily: 'inherit' }}
                    />
                    <span style={{ fontSize: 12, color: '#CCCCCC' }}>%</span>
                  </div>
                )}
                {form.splitType === 'custom' && (
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={d.amount}
                    onChange={e => { const nd = [...splitData]; nd[i].amount = e.target.value; setSplitData(nd); }}
                    style={{ width: 88, height: 36, borderRadius: 4, border: '1px solid #CCCCCC', background: '#F5F5F5', color: '#333', fontSize: 14, fontWeight: 600, textAlign: 'center', outline: 'none', fontFamily: 'inherit' }}
                  />
                )}
                {form.splitType === 'shares' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="number" min="0.5" step="0.5" value={d.shares}
                      onChange={e => { const nd = [...splitData]; nd[i].shares = e.target.value; setSplitData(nd); }}
                      style={{ width: 60, height: 36, borderRadius: 4, border: '1px solid #CCCCCC', background: '#F5F5F5', color: '#333', fontSize: 14, fontWeight: 600, textAlign: 'center', outline: 'none', fontFamily: 'inherit' }}
                    />
                    <span style={{ fontSize: 12, color: '#CCCCCC' }}>×</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Recurring — spec §2.10 Toggle ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: form.isRecurring ? 16 : 24 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#333', display:'flex', alignItems:'center', gap:6 }}>↻ Recurring expense</div>
            <div style={{ fontSize: 12, color: '#CCCCCC', marginTop: 2 }}>Auto-adds on a schedule</div>
          </div>
          <label className="switch">
            <input type="checkbox" checked={form.isRecurring} onChange={e => set('isRecurring', e.target.checked)} />
            <span className="switch-track" />
          </label>
        </div>

        {form.isRecurring && (
          <div style={{ marginBottom: 24 }}>
            <label className="field-label">Repeat interval</label>
            <select className="field-select" value={form.recurInterval} onChange={e => set('recurInterval', e.target.value)}>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        )}

        {/* ── Submit — spec §2.1 Primary Button ── */}
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={submitting || !form.amount || !form.description.trim()}
        >
          {submitting ? <span className="spinner" style={{ width: 18, height: 18, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor"/></svg>}
          {submitting ? 'Adding…' : 'Add Expense'}
        </button>
      </div>
    </div>
  );
}

// Helper to avoid template literals in JSX style props
function var_md() { return '8px'; }
