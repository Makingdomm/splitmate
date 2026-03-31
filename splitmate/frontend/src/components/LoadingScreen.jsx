import React from 'react';

// Onboarding loading state — spec §3.1 style
export default function LoadingScreen() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#4B5320',
      gap: 24,
      padding: '32px',
    }}>
      {/* App logo */}
      <img
        src="/logo.png"
        alt="SplitMate"
        style={{ width: 96, height: 96, borderRadius: 22, objectFit: 'cover', marginBottom: 8 }}
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
