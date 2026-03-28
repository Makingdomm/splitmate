// =============================================================================
// components/LoadingScreen.jsx — Shown while app initializes
// =============================================================================

import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-logo">💸</div>
      <div className="loading-spinner" />
      <p className="loading-text">SplitMate</p>
    </div>
  );
}
