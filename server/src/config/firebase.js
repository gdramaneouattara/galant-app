const { initializeApp, credential, apps } = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');
const { getStorage } = require('firebase-admin/storage');
require('dotenv').config();

/**
 * FIREBASE ADMIN INITIALIZATION
 * Modern modular syntax to ensure compatibility with Cloud Run and Node 22.
 */

let firebaseCredential;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccountData = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    firebaseCredential = credential.cert(serviceAccountData);
  } else {
    try {
      // Local development
      const serviceAccount = require('../../firebase-service-account.json');
      firebaseCredential = credential.cert(serviceAccount);
    } catch (e) {
      // Cloud Run Production: Official method for Application Default Credentials
      firebaseCredential = credential.applicationDefault();
    }
  }
} catch (err) {
  console.error('🔥 Firebase Credential Error:', err.message);
}

const app = !apps.length ? initializeApp({
  credential: firebaseCredential,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
}) : apps[0];

module.exports = {
  admin: require('firebase-admin'),
  db: getFirestore(app),
  auth: getAuth(app),
  rtdb: getDatabase(app),
  bucket: getStorage(app).bucket()
};
