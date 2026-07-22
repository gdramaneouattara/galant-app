const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');
const { getStorage } = require('firebase-admin/storage');
require('dotenv').config();

/**
 * FIREBASE ADMIN MODULAR INITIALIZATION
 * Verified for Firebase Admin v14+ on Cloud Run.
 */

let app;

try {
  if (getApps().length === 0) {
    const config = {
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    };

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log('ℹ️ Initializing with Service Account from ENV');
      config.credential = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
    }
    // Sur Cloud Run, si pas de credential, il utilise ADC automatiquement

    app = initializeApp(config);
    console.log('✅ Firebase Modular initialized.');
  } else {
    app = getApps()[0];
  }
} catch (error) {
  console.error('⚠️ Firebase Modular Init Error:', error.message);
}

module.exports = {
  app,
  db: app ? getFirestore(app) : null,
  auth: app ? getAuth(app) : null,
  rtdb: app ? getDatabase(app) : null,
  bucket: app ? getStorage(app).bucket() : null,
  admin: require('firebase-admin') // For legacy compatibility
};
