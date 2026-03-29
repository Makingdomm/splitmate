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
  tg.expand(); // Expand to full available height
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
