import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { mkdirSync, writeFileSync } from 'fs'

const buildFirebaseMessagingSw = (env: Record<string, string>) => {
  const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY || '',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
    databaseURL: env.VITE_FIREBASE_DATABASE_URL || '',
    projectId: env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: env.VITE_FIREBASE_APP_ID || '',
  };

  return `/* Generated at build time. Firebase web config is public by design. */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const firebaseConfig = ${JSON.stringify(firebaseConfig, null, 2)};
const isConfigValid = !!firebaseConfig.apiKey && !!firebaseConfig.projectId && !!firebaseConfig.messagingSenderId;

if (isConfigValid) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification?.title || payload.data?.title || 'Galant';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || payload.data?.message || 'Nouvelle notification',
      icon: new URL('galant-logo-web.png', self.registration.scope).toString(),
      badge: new URL('galant-logo-web.png', self.registration.scope).toString(),
      data: payload.data || {},
      tag: payload.data?.type ? 'galant-' + payload.data.type : undefined,
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetPath = data.matchId ? 'chat/' + encodeURIComponent(data.matchId) : '';
  const targetUrl = new URL(targetPath, self.registration.scope).toString();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client && client.url.startsWith(self.registration.scope)) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
`;
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  // Détecte si on est sur GitHub Pages (staging) via la variable d'env GITHUB_ACTIONS
  // ou si le mode est explicitement staging
  const isGitHubPages = process.env.GITHUB_ACTIONS === 'true' || mode === 'staging';
  const pwaRoot = isGitHubPages ? '/galant-app/' : '/';

  return {
    // Utilise /galant-app/ pour GitHub Pages, sinon la racine
    base: pwaRoot,
    plugins: [
      react(),
      {
        name: 'galant-firebase-messaging-sw',
        closeBundle() {
          const outDir = path.resolve(__dirname, 'dist');
          mkdirSync(outDir, { recursive: true });
          writeFileSync(path.join(outDir, 'firebase-messaging-sw.js'), buildFirebaseMessagingSw(env));
        },
      },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['galant-logo-web.png', 'favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Galant - L\'Élégance à chaque rencontre',
        short_name: 'Galant',
        description: 'La première plateforme de rencontre premium en Afrique Centrale.',
        lang: 'fr',
        id: pwaRoot,
        start_url: pwaRoot,
        scope: pwaRoot,
        theme_color: '#ef4444',
        background_color: '#0f172a',
        display: 'standalone', // Mode "App" sans barre d'adresse
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      cleanupOutdatedCaches: true,
      injectRegister: false,
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/.*$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'galant-media-cache',
              expiration: {
                maxEntries: 250,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 jours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/(images\.unsplash\.com|i\.pravatar\.cc|placehold\.co)\/.*$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'galant-remote-image-cache',
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 7
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../src'),
    },
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.js']
  },
  define: {
    'global': 'window',
    'process.env': {},
  },
  build: {
    rollupOptions: {
      output: {
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          const moduleId = id.replace(/\\/g, '/');
          if (moduleId.includes('/firebase/auth')) return 'vendor-firebase-auth';
          if (moduleId.includes('/firebase/firestore')) return 'vendor-firebase-firestore';
          if (moduleId.includes('/firebase/storage')) return 'vendor-firebase-storage';
          if (moduleId.includes('/firebase/database')) return 'vendor-firebase-database';
          if (moduleId.includes('/firebase/app')) return 'vendor-firebase-core';
          if (moduleId.includes('/@firebase/firestore')) return 'vendor-firebase-firestore';
          if (moduleId.includes('/@firebase/auth')) return 'vendor-firebase-auth';
          if (moduleId.includes('/@firebase/storage')) return 'vendor-firebase-storage';
          if (moduleId.includes('/@firebase/database')) return 'vendor-firebase-database';
          if (moduleId.includes('/@firebase/app') || moduleId.includes('/@firebase/component') || moduleId.includes('/@firebase/logger') || moduleId.includes('/@firebase/util')) return 'vendor-firebase-core';
          if (moduleId.includes('/firebase/') || moduleId.includes('/@firebase/')) return 'vendor-firebase-core';
          if (moduleId.includes('react-router')) return 'vendor-router';
          if (moduleId.includes('lucide-react')) return 'vendor-icons';
          if (moduleId.includes('react') || moduleId.includes('scheduler')) return 'vendor-react';
          return 'vendor';
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
  };
});
