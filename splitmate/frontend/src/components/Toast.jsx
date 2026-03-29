import React, { useEffect, useState } from 'react';

// FIX: Accept both onClose and onDone for compatibility
export default function Toast({ message, type = 'info', onClose, onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onClose?.();
      onDone?.();
    }, 2800);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const bgColor = type === 'error'
    ? 'rgba(240,82,82,0.95)'
    : type === 'warning'
    ? 'rgba(245,158,11,0.95)'
    : 'rgba(34,197,94,0.95)';

  return (
    <div style={{
      position: 'fixed',
      bottom: 88,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      padding: '12px 20px',
      borderRadius: 14,
      background: bgColor,
      color: '#fff',
      fontSize: 14,
      fontWeight: 700,
      boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      maxWidth: 'calc(100vw - 40px)',
      textAlign: 'center',
      animation: 'toastIn 0.2s ease',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    }}>
      <style>{`@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
      {type === 'success' && '✓ '}
      {type === 'error'   && '✕ '}
      {type === 'warning' && '⚠ '}
      {message}
    </div>
  );
}
