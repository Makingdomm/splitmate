import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="loading-screen">
      {/* Glow behind logo */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -70%)',
        width: 220, height: 220,
        background: 'radial-gradient(circle, rgba(79,142,247,0.18) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />
      <img
        src="/logo.png"
        alt="SplitMate"
        style={{
          width: 90, height: 90,
          borderRadius: 24,
          boxShadow: '0 8px 40px rgba(79,142,247,0.45)',
          marginBottom: 6,
          objectFit: 'cover',
        }}
      />
      <div className="spinner" />
      <p className="loading-text">Loading SplitMate…</p>
    </div>
  );
}
