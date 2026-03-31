import React from 'react';

export default function LoadingScreen() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#4B5320',
      gap: 20,
      padding: '32px',
    }}>
      {/* Logo — transparent PNG, no white box */}
      <img
        src="/logo.png"
        alt="SplitMate"
        style={{ width: 110, height: 110, objectFit: 'contain', marginBottom: 4 }}
      />

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', lineHeight: '40px', marginBottom: 8 }}>
          SplitMate
        </div>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', lineHeight: '24px' }}>
          Loading your groups…
        </div>
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
