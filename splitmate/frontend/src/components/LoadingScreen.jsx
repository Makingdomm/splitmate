import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="loading-screen">
      {/* Glow behind logo */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -70%)',
        width: 200, height: 200,
        background: 'radial-gradient(circle, rgba(79,142,247,0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />
      <div style={{
        width: 64, height: 64,
        background: 'linear-gradient(135deg, #4f8ef7 0%, #6a5ef7 100%)',
        borderRadius: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 30,
        boxShadow: '0 8px 32px rgba(79,142,247,0.4)',
        marginBottom: 4,
      }}>
        💸
      </div>
      <div className="spinner" />
      <p className="loading-text">Loading SplitMate…</p>
    </div>
  );
}
