// =============================================================================
// components/Toast.jsx — Temporary notification messages
// =============================================================================

import React, { useEffect } from 'react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`toast toast-${type}`} onClick={onClose}>
      <span className="toast-icon">{type === 'error' ? '❌' : '✅'}</span>
      <span className="toast-message">{message}</span>
    </div>
  );
}
