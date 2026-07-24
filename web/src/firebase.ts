import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Vérification de la configuration pour éviter le crash au chargement
const isConfigValid = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

let app;
try {
  if (!isConfigValid) {
    console.warn("Firebase configuration is missing or incomplete. Check environment variables.");
  }
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (error) {
  console.error("Firebase initialization failed:", error);
  // On crée une app "bidon" ou on laisse undefined pour que les services échouent plus tard proprement
  app = getApps().length > 0 ? getApp() : null;
}

export const fbAuth = app ? getAuth(app) : ({} as any);
export const db = app ? getFirestore(app) : ({} as any);
export const rtdb = app ? getDatabase(app) : ({} as any);
export const fbStorage = app ? getStorage(app) : ({} as any);

export const COLLECTIONS = {
  PROFILES: 'profiles',
  VENUES: 'venues',
  MATCHES: 'matches',
  REPORTS: 'reports',
  KYC: 'kyc_requests',
  NOTIFICATIONS: 'notifications',
  SUBSCRIPTIONS: 'subscriptions',
  STORIES: 'stories'
};

export default { app, fbAuth, db, rtdb, fbStorage };
