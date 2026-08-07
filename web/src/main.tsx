import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { installChunkRecovery } from './lib/chunkRecovery.ts'

installChunkRecovery();

// Enregistrement sécurisé du Service Worker
import('virtual:pwa-register')
  .then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        window.location.reload();
      },
      onOfflineReady() {
        console.info('Galant is ready for offline use.');
      },
    });
  })
  .catch(() => {
    console.warn('PWA Service Worker registration skipped or failed.');
  });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

;(window as any).__GALANT_APP_BOOTED = true;
