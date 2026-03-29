// =============================================================================
// main.jsx — React app entry point
// Initializes Telegram Mini App SDK and TON Connect before rendering
// =============================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import App from './App.jsx';
import './index.css';

// Initialize Telegram Mini App SDK
// This MUST be called before accessing window.Telegram.WebApp
if (window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand(); // Expand to full available height
}

// TON Connect manifest — tells wallets what app is requesting connection
const MANIFEST_URL = `${window.location.origin}/tonconnect-manifest.json`;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TonConnectUIProvider manifestUrl={MANIFEST_URL}>
      <App />
    </TonConnectUIProvider>
  </React.StrictMode>
);
