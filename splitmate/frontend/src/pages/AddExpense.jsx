import React, { useState, useEffect, useRef } from 'react';
import useAppStore from '../store/appStore.js';
import api from '../utils/api.js';

const CATEGORIES = [
  { value: 'food',          icon: '🍕', name: 'Food' },
  { value: 'transport',     icon: '🚗', name: 'Transport' },
  { value: 'accommodation', icon: '🏨', name: 'Hotel' },
  { value: 'entertainment', icon: '🎬', name: 'Fun' },
  { value: 'shopping',      icon: '🛍️', name: 'Shop' },
  { value: 'health',        icon: '💊', name: 'Health' },
  { value: 'utilities',     icon: '💡', name: 'Bills' },
  { value: 'general',       icon: '💰', name: 'Other' },
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
      onToast(`✅ ${data.merchant || 'Receipt'} scanned!`);
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
      ...(form.splitType === 'custom' ? { amount: parseFloat(d.amount) || 0 } : {}),
      ...(form.splitType === 'shares' ? { shares: parseFloat(d.shares) || 1 } : {}),
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
      onToast(form.isRecurring ? 'Recurring expense added! 🔄' : 'Expense added! 💸');
      onNavigate('group-detail');
    } catch (err) {
      err.code === 'PRO_REQUIRED' ? (setDraftExpenseForm(form), onNavigate('pro')) : onToast(err.message, 'error');
    } finally { setSubmitting(false); }
  };

  if (!activeGroup) { onNavigate('groups'); return null; }
  const isPro = paymentStatus?.isPro;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 40 }}>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleScanReceipt} />

      {/* ── Header ── */}
      <div className="page-header">
        <button className="btn-icon" onClick={() => onNavigate('group-detail')} style={{ fontSize: 22 }}>‹</button>
        <div style={{ flex: 1 }}>
          <div className="page-header-title">Add Expense</div>
          <div className="page-header-sub">{activeGroup.name}</div>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={scanning}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            height: 38, padding: '0 14px',
            background: isPro ? 'var(--brand-light)' : 'var(--surface)',
            border: `1.5px solid ${isPro ? 'var(--brand-mid)' : 'var(--border)'}`,
            borderRadius: 100, cursor: 'pointer',
            fontSize: 12, fontWeight: 800,
            color: isPro ? 'var(--brand)' : 'var(--text-3)',
            fontFamily: 'var(--font)',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.12s',
          }}
        >
          {scanning ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : '✨'}
          {scanning ? 'Scanning…' : 'Scan Receipt'}
          {!isPro && <span style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 800, marginLeft: 2 }}>PRO</span>}
        </button>
      </div>

      <div style={{ padding: '20px 16px 0' }}>

        {/* Scan Result Banner */}
        {scanResult && (
          <div className="animate-in" style={{ background: 'var(--green-dim)', border: '1.5px solid rgba(74,94,56,0.25)', borderRadius: 'var(--r-lg)', padding: '12px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--brand)', marginBottom: 2 }}>Receipt scanned!</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{scanResult.merchant} · {scanResult.currency} {scanResult.total}</div>
            </div>
            <button onClick={() => setScanResult(null)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 14, cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* ── Amount ── */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Amount</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <select
              value={form.currency}
              onChange={e => set('currency', e.target.value)}
              style={{ height: 72, padding: '0 12px', borderRadius: 'var(--r-lg)', border: '1.5px solid var(--brand-mid)', background: 'var(--brand-light)', color: 'var(--brand)', fontSize: 14, fontWeight: 800, fontFamily: 'var(--font)', outline: 'none', cursor: 'pointer', flexShrink: 0, boxShadow: 'var(--shadow-sm)' }}
            >
              {currencies.length > 0
                ? currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)
                : ['USD','EUR','GBP','JPY','CAD','AUD'].map(c => <option key={c} value={c}>{c}</option>)
              }
            </select>
            <input
              className="field-input amount"
              type="number" inputMode="decimal" step="0.01" min="0"
              placeholder="0.00"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              style={{ flex: 1, maxWidth: 200 }}
            />
          </div>
        </div>

        {/* ── Description ── */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">What was it for?</label>
          <input
            className="field-input"
            type="text" placeholder="e.g. Dinner at Mario's…"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            maxLength={200}
          />
        </div>

        {/* ── Category ── */}
        <div style={{ marginBottom: 18 }}>
          <div className="field-label">Category</div>
          <div className="chip-row">
            {CATEGORIES.map(cat => (
              <button key={cat.value} className={`chip ${form.category === cat.value ? 'active' : ''}`} onClick={() => set('category', cat.value)}>
                <span className="chip-icon">{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* ── Paid By ── */}
        <div style={{ marginBottom: 16 }}>
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
        <div style={{ marginBottom: 18 }}>
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
          <div className="card animate-in" style={{ marginBottom: 18, overflow: 'hidden' }}>
            {splitData.map((d, i) => (
              <div key={d.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: i < splitData.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div className="avatar avatar-sm">{d.name.charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{d.name}</div>
                {form.splitType === 'percentage' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="number" min="0" max="100" value={d.percentage}
                      onChange={e => { const nd = [...splitData]; nd[i].percentage = e.target.value; setSplitData(nd); }}
                      style={{ width: 64, height: 36, borderRadius: 100, border: '1.5px solid var(--border-med)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14, fontWeight: 800, textAlign: 'center', outline: 'none', fontFamily: 'var(--font)' }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>%</span>
                  </div>
                )}
                {form.splitType === 'custom' && (
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={d.amount}
                    onChange={e => { const nd = [...splitData]; nd[i].amount = e.target.value; setSplitData(nd); }}
                    style={{ width: 88, height: 36, borderRadius: 100, border: '1.5px solid var(--border-med)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14, fontWeight: 800, textAlign: 'center', outline: 'none', fontFamily: 'var(--font)' }}
                  />
                )}
                {form.splitType === 'shares' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="number" min="0.5" step="0.5" value={d.shares}
                      onChange={e => { const nd = [...splitData]; nd[i].shares = e.target.value; setSplitData(nd); }}
                      style={{ width: 64, height: 36, borderRadius: 100, border: '1.5px solid var(--border-med)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14, fontWeight: 800, textAlign: 'center', outline: 'none', fontFamily: 'var(--font)' }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>×</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Recurring ── */}
        <div className="toggle-row" style={{ marginBottom: form.isRecurring ? 12 : 24 }}>
          <div>
            <div className="toggle-label">🔄 Recurring expense</div>
            <div className="toggle-desc">Auto-adds on a schedule</div>
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

        {/* ── Submit ── */}
        <button className="btn-brand" onClick={handleSubmit} disabled={submitting || !form.amount || !form.description.trim()}>
          {submitting ? <span className="spinner" style={{ width: 20, height: 20, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : '💸'}
          {submitting ? 'Adding…' : 'Add Expense'}
        </button>
      </div>
    </div>
  );
}
