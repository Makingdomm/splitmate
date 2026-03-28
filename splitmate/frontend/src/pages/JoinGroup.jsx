import React, { useState } from 'react';
import useAppStore from '../store/appStore.js';
import api from '../utils/api.js';

export default function JoinGroup({ onNavigate, onToast }) {
  const { joinGroup } = useAppStore();
  const [code, setCode]       = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePreview = async () => {
    if (code.trim().length < 4) return;
    setLoading(true);
    try {
      const { group } = await api.groups.preview(code.trim().toUpperCase());
      setPreview(group);
    } catch {
      setPreview(null); onToast('Invalid invite code', 'error');
    } finally { setLoading(false); }
  };

  const handleJoin = async () => {
    setSubmitting(true);
    try {
      await joinGroup(code.trim().toUpperCase());
      onToast(`Joined ${preview?.name || 'group'}! 🎉`);
      onNavigate('groups');
    } catch (err) {
      err.code === 'FREE_LIMIT_REACHED' ? onNavigate('pro') : onToast(err.message, 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#060818 0%,#0a0f2e 40%,#060818 100%)', paddingBottom:40, position:'relative', overflow:'hidden' }}>
      <style>{`.code-inp:focus{border-color:rgba(79,142,247,0.5)!important;background:rgba(79,142,247,0.08)!important;outline:none;}`}</style>
      <div style={{ position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)', width:340, height:340, background:'radial-gradient(circle,rgba(59,110,246,0.13) 0%,transparent 65%)', borderRadius:'50%', pointerEvents:'none' }} />

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'20px 16px 24px', position:'relative', zIndex:1 }}>
        <button onClick={() => onNavigate('groups')} style={{ width:36, height:36, borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'#a0b0e0', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>‹</button>
        <div>
          <h1 style={{ fontSize:20, fontWeight:900, color:'#fff', letterSpacing:-0.3 }}>Join Group</h1>
          <p style={{ fontSize:12, color:'#4a5080' }}>Enter an invite code from a friend</p>
        </div>
      </div>

      <div style={{ padding:'0 16px', position:'relative', zIndex:1 }}>
        {/* Code input */}
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:11, fontWeight:700, color:'#3d4870', textTransform:'uppercase', letterSpacing:0.8, display:'block', marginBottom:8 }}>Invite Code</label>
          <input
            className="code-inp"
            style={{ width:'100%', height:58, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:16, padding:'0 18px', color:'#e8eeff', fontSize:22, fontWeight:800, letterSpacing:4, textAlign:'center', boxSizing:'border-box', textTransform:'uppercase', transition:'all 0.2s' }}
            type="text"
            placeholder="ABC12345"
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setPreview(null); }}
            onBlur={handlePreview}
            maxLength={10}
            autoFocus
          />
          <p style={{ fontSize:12, color:'#3d4870', marginTop:8, textAlign:'center' }}>
            Ask your friend to share their group invite code
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign:'center', padding:'20px', color:'#4a5080', fontSize:14 }}>
            🔍 Looking up group…
          </div>
        )}

        {/* Preview card */}
        {preview && (
          <div style={{ background:'rgba(34,212,122,0.06)', border:'1px solid rgba(34,212,122,0.2)', borderRadius:20, padding:'20px', marginBottom:20, display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:52, height:52, borderRadius:16, background:'linear-gradient(135deg,rgba(79,142,247,0.3),rgba(106,94,247,0.3))', border:'1px solid rgba(79,142,247,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:900, color:'#7ab4ff', flexShrink:0 }}>
              {preview.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:'#e8eeff', marginBottom:4 }}>{preview.name}</div>
              <div style={{ fontSize:13, color:'#4a5080' }}>{preview.member_count} members · {preview.currency}</div>
              {preview.description && <div style={{ fontSize:12, color:'#3d4870', marginTop:4 }}>{preview.description}</div>}
            </div>
            <div style={{ marginLeft:'auto', fontSize:22, color:'#22d47a' }}>✓</div>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={preview ? handleJoin : handlePreview}
          disabled={code.length < 4 || submitting || loading}
          style={{
            width:'100%', height:56,
            background: (code.length < 4 || submitting) ? 'rgba(79,142,247,0.2)' : preview ? 'linear-gradient(135deg,#22d47a,#10b458)' : 'linear-gradient(135deg,#4f8ef7,#6a5ef7)',
            border:'none', borderRadius:18,
            fontSize:16, fontWeight:800, color:'#fff', cursor: code.length < 4 ? 'not-allowed' : 'pointer',
            boxShadow: code.length < 4 ? 'none' : preview ? '0 4px 20px rgba(34,212,122,0.35)' : '0 4px 20px rgba(79,142,247,0.4)',
            transition:'all 0.2s',
          }}
        >
          {submitting ? '⏳ Joining…' : loading ? '🔍 Searching…' : preview ? '🎉 Join Group' : 'Find Group →'}
        </button>
      </div>
    </div>
  );
}
