// JoinGroup.jsx — spec design
import React, { useState } from 'react';
import useAppStore from '../store/appStore.js';

export default function JoinGroup({ onNavigate, onToast }) {
  const { joinGroup } = useAppStore();
  const [code, setCode]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { onToast('Enter an invite code','error'); return; }
    setLoading(true);
    try {
      await joinGroup(trimmed);
      onToast('Joined! Welcome to the group 🎉');
      onNavigate('group-detail');
    } catch (err) { onToast(err.message,'error'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#F5F5F5', paddingBottom:40 }}>
      <div className="page-header">
        <button className="btn-icon" onClick={() => onNavigate('groups')} style={{ fontSize:20, background:'#F5F5F5' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 8L8 12L12 16" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 12H8" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        <div className="page-header-title">Join Group</div>
      </div>

      <div style={{ padding:'24px' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:72, height:72, borderRadius:22, background:'linear-gradient(135deg,#4B5320,#6B7B3A)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', display:'flex', alignItems:'center', justifyContent:'center' }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11Z" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 8V14" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 11H23" stroke="#4B5320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
          <div style={{ fontSize:14, color:'#CCCCCC' }}>Ask your friend for the invite link or code</div>
        </div>

        <div style={{ marginBottom:32 }}>
          <label className="field-label">Invite Code</label>
          <input
            className="field-input"
            type="text"
            placeholder="e.g. AB12CD"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key==='Enter' && handleJoin()}
            maxLength={20}
            autoCapitalize="characters"
            autoFocus
            style={{ textAlign:'center', letterSpacing:4, fontSize:20, fontWeight:700 }}
          />
        </div>

        <button className="btn-primary" onClick={handleJoin} disabled={loading || !code.trim()}>
          {loading ? <span className="spinner" style={{width:16,height:16,borderColor:'rgba(255,255,255,0.3)',borderTopColor:'#fff'}} /> : null}
          {loading ? 'Joining…' : 'Join Group'}
        </button>

        <div style={{ textAlign:'center', marginTop:20 }}>
          <span style={{ fontSize:14, color:'#CCCCCC' }}>Don't have a code? </span>
          <button onClick={() => onNavigate('create-group')} style={{ background:'none', border:'none', fontSize:14, fontWeight:600, color:'#4B5320', cursor:'pointer', fontFamily:'inherit' }}>
            Create a group →
          </button>
        </div>
      </div>
    </div>
  );
}
