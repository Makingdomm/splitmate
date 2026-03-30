import React from 'react';

export default function LoadingScreen() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', gap: 16,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 24,
        background: 'linear-gradient(135deg, #4a5e38 0%, #3a4d2a 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32,
        boxShadow: '0 8px 32px rgba(74,94,56,0.35)',
      }}>
        💸
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', letterSpacing: -0.4, marginBottom: 4 }}>SplitMate</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>Loading your groups…</div>
      </div>
      <div className="spinner" />
    </div>
  );
}
