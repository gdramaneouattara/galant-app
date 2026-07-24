const admin = require('firebase-admin');
require('dotenv').config();

/**
 * FIREBASE ADMIN INITIALIZATION - FINAL COMPATIBILITY FIX
 * This version uses the most resilient check for Cloud Run environments.
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
    // 1. Priorité au Service Account (Local ou spécifique)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log('ℹ️ Initializing Firebase with Service Account from ENV');
      config.credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
    }
    // 2. Repli sur le fichier JSON local si présent
    else {
      try {
        const localKeys = require('../../firebase-service-account.json');
        console.log('✅ Initializing Firebase with local JSON file');
        config.credential = admin.credential.cert(localKeys);
      } catch (e) {
        // 3. Cloud Run : Utilisation automatique des droits du projet
        console.log('ℹ️ No explicit credentials found, using Application Default Credentials');
        // Sur Cloud Run, on ne définit PAS config.credential, initializeApp le trouve tout seul
      }
    }

    return admin.initializeApp(config);
  } catch (error) {
    console.error('⚠️ Firebase Initialization critical error:', error.message);
    // On initialise vide pour ne pas crasher le container et permettre le déploiement
    return admin.initializeApp();
  }
};

const app = initializeFirebase();

let bucket = null;
try {
  bucket = app.storage().bucket();
  console.log('✅ Firebase Storage bucket initialized');
} catch (e) {
  console.error('⚠️ Firebase Storage initialization failed:', e.message);
}

module.exports = {
  admin,
  db: app.firestore(),
  auth: app.auth(),
  rtdb: app.database(),
  bucket
};
