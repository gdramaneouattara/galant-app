import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

// Enregistrement sécurisé du Service Worker
import('virtual:pwa-register')
  .then(({ registerSW }) => {
    registerSW({ immediate: true });
  })
  .catch(() => {
    console.warn('PWA Service Worker registration skipped or failed.');
  });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
