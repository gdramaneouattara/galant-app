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

// Initialisation propre au Web
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const fbAuth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const fbStorage = getStorage(app);

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
