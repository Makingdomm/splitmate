// =============================================================================
// vite.config.js — Vite build configuration for SplitMate Mini App
// =============================================================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // Dev server — proxies API calls to backend to avoid CORS in development
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target:      'http://localhost:3000',
        changeOrigin: true,
      },
      '/webhook': {
        target:      'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir:    'dist',
    sourcemap: false,        // Disable sourcemaps in production
    rollupOptions: {
      output: {
        // Split vendor chunks for better caching
        manualChunks: {
          vendor: ['react', 'react-dom'],
          store:  ['zustand'],
        },
      },
    },
  },

  // Expose env vars to the frontend (must be prefixed with VITE_)
  envPrefix: 'VITE_',
});
