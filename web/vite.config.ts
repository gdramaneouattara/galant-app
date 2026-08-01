import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Détecte si on est sur GitHub Pages (staging) via la variable d'env GITHUB_ACTIONS
  // ou si le mode est explicitement staging
  const isGitHubPages = process.env.GITHUB_ACTIONS === 'true' || mode === 'staging';

  return {
    // Utilise /galant-app/ pour GitHub Pages, sinon la racine
    base: isGitHubPages ? '/galant-app/' : '/',
    plugins: [
      react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Galant - L\'Élégance à chaque rencontre',
        short_name: 'Galant',
        description: 'La première plateforme de rencontre premium en Afrique Centrale.',
        theme_color: '#ef4444',
        background_color: '#f8fafc',
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
      workbox: {
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
