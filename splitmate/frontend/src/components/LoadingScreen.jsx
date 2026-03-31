import React from 'react';

export default function LoadingScreen() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#4B5320',
      gap: 16,
      padding: '32px',
    }}>
      {/* Full logo — transparent PNG, let it breathe */}
      <img
        src="/logo.png"
        alt="SplitMate"
        style={{ width: 180, height: 180, objectFit: 'contain' }}
      />

      <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', lineHeight: '24px' }}>
        Loading your groups…
      </div>

      <div style={{
        width: 20, height: 20,
        border: '2.5px solid rgba(255,255,255,0.25)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
    </div>
  );
}
