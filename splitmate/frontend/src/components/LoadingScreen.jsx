import React from 'react';

export default function LoadingScreen() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#ffffff',
      gap: 0,
      padding: '32px',
    }}>
      {/* Full logo — icon + SplitMate text */}
      <img
        src="/logo.png"
        alt="SplitMate"
        style={{ width: 260, height: 260, objectFit: 'contain', marginBottom: 24 }}
      />

      <div style={{ fontSize: 16, color: '#6B7B3A', lineHeight: '24px', marginBottom: 24 }}>
        Loading your groups…
      </div>

      <div style={{
        width: 20, height: 20,
        border: '2.5px solid #e0e0e0',
        borderTopColor: '#4B5320',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
    </div>
  );
}
