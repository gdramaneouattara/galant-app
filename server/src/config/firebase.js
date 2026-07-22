const admin = require('firebase-admin');
const { credential } = require('firebase-admin');
require('dotenv').config();

/**
 * FIREBASE ADMIN INITIALIZATION
 * Robust initialization for both local and Cloud Run environments.
 */

let firebaseCredential;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Production/CI: via environment variable
  try {
    const serviceAccountData = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    firebaseCredential = admin.credential.cert(serviceAccountData);
  } catch (e) {
    console.error('🔥 Error parsing FIREBASE_SERVICE_ACCOUNT:', e.message);
  }
} else {
  try {
    // Local development: via JSON file
    const serviceAccount = require('../../firebase-service-account.json');
    firebaseCredential = admin.credential.cert(serviceAccount);
    console.log('✅ Firebase initialized with local service account file.');
  } catch (e) {
    // Cloud Run Production: Fallback to Application Default Credentials
    console.log('ℹ️ Local service account missing, using Cloud Run Default Credentials.');
    firebaseCredential = admin.credential.applicationDefault();
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: firebaseCredential,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
}

const db = admin.firestore();
const auth = admin.auth();
const rtdb = admin.database();
const bucket = admin.storage().bucket();

module.exports = {
  admin,
  db,
  auth,
  rtdb,
  bucket
};
