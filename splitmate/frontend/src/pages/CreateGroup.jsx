// CreateGroup.jsx — spec design
import React, { useState } from 'react';
import useAppStore from '../store/appStore.js';

const CURRENCIES = ['USD','EUR','GBP','JPY','CAD','AUD','CHF','RUB','UAH','TRY','AED','IDR','INR','BRL','MXN'];

export default function CreateGroup({ onNavigate, onToast }) {
  const { createGroup } = useAppStore();
  const [name, setName]         = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading]   = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { onToast('Enter a group name','error'); return; }
    setLoading(true);
    try {
      await createGroup({ name: name.trim(), currency });
      onToast(`"${name.trim()}" created! 🎉`);
      onNavigate('group-detail');
    } catch (err) { onToast(err.message,'error'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#F5F5F5', paddingBottom:40 }}>
      {/* Header */}
      <div className="page-header">
        <button className="btn-icon" onClick={() => onNavigate('groups')} style={{ fontSize:20, background:'#F5F5F5' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 8L8 12L12 16" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 12H8" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        <div className="page-header-title">New Group</div>
      </div>

      <div style={{ padding:'24px' }}>
        {/* Icon */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:72, height:72, borderRadius:22, background:'linear-gradient(135deg,#4B5320,#6B7B3A)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', display:'flex', alignItems:'center', justifyContent:'center' }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11Z" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 8V14" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 11H23" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
          <div style={{ fontSize:14, color:'#CCCCCC' }}>Invite friends after creating</div>
        </div>

        <div style={{ marginBottom:24 }}>
          <label className="field-label">Group Name</label>
          <input
            className="field-input"
            type="text"
            placeholder="e.g. Bali Trip 2026, Flatmates…"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key==='Enter' && handleCreate()}
            maxLength={60}
            autoFocus
          />
        </div>

        <div style={{ marginBottom:32 }}>
          <label className="field-label">Default Currency</label>
          <select className="field-select" value={currency} onChange={e => setCurrency(e.target.value)}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <button className="btn-primary" onClick={handleCreate} disabled={loading || !name.trim()}>
          {loading ? <span className="spinner" style={{width:16,height:16,borderColor:'rgba(255,255,255,0.3)',borderTopColor:'#fff'}} /> : null}
          {loading ? 'Creating…' : 'Create Group'}
        </button>
      </div>
    </div>
  );
}
