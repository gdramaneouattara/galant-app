const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');
const { getStorage } = require('firebase-admin/storage');

require('dotenv').config();

/**
 * FIREBASE ADMIN INITIALIZATION - MODULAR SDK V10+ COMPATIBILITY
 */

const initializeFirebase = () => {
  // Ultra-resilient check for existing apps
  try {
    const apps = admin && admin.apps ? admin.apps : [];
    if (Array.isArray(apps) && apps.length > 0) {
      console.log('ℹ️ Firebase already initialized, reusing instance');
      return admin.app();
    }
  } catch (e) {
    console.warn('⚠️ Error checking existing Firebase apps:', e.message);
  }

  const config = {
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  };

  try {
    // 1. Service Account from ENV
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log('ℹ️ Initializing Firebase with Service Account from ENV');
      config.credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
    }
    // 2. Local JSON fallback
    else {
      try {
        const localKeys = require('../../firebase-service-account.json');
        console.log('✅ Initializing Firebase with local JSON file');
        config.credential = admin.credential.cert(localKeys);
      } catch (e) {
        console.log('ℹ️ No explicit credentials found, using Application Default Credentials');
      }
    }

    return admin.initializeApp(config);
  } catch (error) {
    console.error('⚠️ Firebase Initialization critical error:', error.message);
    return admin.initializeApp();
  }
};

const app = initializeFirebase();

let bucket = null;
try {
  bucket = getStorage(app).bucket();
  console.log('✅ Firebase Storage bucket initialized');
} catch (e) {
  console.error('⚠️ Firebase Storage initialization failed:', e.message);
}

module.exports = {
  admin,
  db: getFirestore(app),
  auth: getAuth(app),
  rtdb: getDatabase(app),
  bucket
};
