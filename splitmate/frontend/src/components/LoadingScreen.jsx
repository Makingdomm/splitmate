import React from 'react';

// Onboarding loading state — spec §3.1 style
export default function LoadingScreen() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#4B5320', /* Primary Green */
      gap: 24,
      padding: '32px',
    }}>
      {/* Brand mark — spec §3.1: two overlapping squares */}
      <div style={{ position: 'relative', width: 60, height: 60, marginBottom: 8 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: 36, height: 36, borderRadius: 8, background: '#6B7B3A', opacity: 0.9 }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 36, height: 36, borderRadius: 8, background: '#8F974B', opacity: 0.7 }} />
      </div>

      <div style={{ textAlign: 'center' }}>
        {/* Display — 32px bold white */}
        <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', lineHeight: '40px', marginBottom: 8 }}>
          SplitMate
        </div>
        {/* Body Large — 16px white */}
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
