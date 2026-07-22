const admin = require('firebase-admin');
require('dotenv').config();

/**
 * FIREBASE ADMIN INITIALIZATION
 * Robust initialization using named exports from the SDK.
 */

let firebaseCredential;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Production/CI: via environment variable
    const serviceAccountData = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    firebaseCredential = admin.credential.cert(serviceAccountData);
  } else {
    try {
      // Local development: via JSON file
      const serviceAccount = require('../../firebase-service-account.json');
      firebaseCredential = admin.credential.cert(serviceAccount);
    } catch (e) {
      // Cloud Run Production: Fallback to Application Default Credentials
      // Use the direct credential object from the admin package
      firebaseCredential = admin.credential.applicationDefault();
    }
  }
} catch (err) {
  console.error('🔥 Firebase Credential Error:', err.message);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: firebaseCredential,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
}

module.exports = {
  admin,
  db: admin.firestore(),
  auth: admin.auth(),
  rtdb: admin.database(),
  bucket: admin.storage().bucket()
};
