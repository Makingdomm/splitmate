// =============================================================================
// main.jsx — React app entry point
// Initializes Telegram Mini App SDK before rendering
// =============================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Initialize Telegram Mini App SDK
// This MUST be called before accessing window.Telegram.WebApp
if (window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand(); // expand to full height (legacy)

  // Bot API 8.0+: request true fullscreen (no top bar / launch button)
  if (typeof tg.requestFullscreen === 'function') {
    tg.requestFullscreen();
  }

  // Re-request on fullscreen change events (some devices need this)
  tg.onEvent?.('fullscreenChanged', () => {
    if (!tg.isFullscreen && typeof tg.requestFullscreen === 'function') {
      tg.requestFullscreen();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
