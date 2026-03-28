import React, { useEffect, useState } from 'react';

export default function Toast({ message, type = 'info', onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDone?.(); }, 2400);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className={`toast ${type}`}>
      {type === 'success' && '✓ '}
      {type === 'error'   && '✕ '}
      {message}
    </div>
  );
}
