import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// Enregistrement automatique du Service Worker pour les mises à jour
registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
