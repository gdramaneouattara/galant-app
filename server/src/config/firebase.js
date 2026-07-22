const admin = require('firebase-admin');
require('dotenv').config();

/**
 * FIREBASE ADMIN INITIALIZATION
 * Absolute fallback logic to ensure startup on Cloud Run.
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
      console.log('✅ Firebase initialized with local service account file.');
    } catch (e) {
      // Cloud Run Production: Official Application Default Credentials
      // Use the global admin object which is guaranteed to exist
      if (admin.credential) {
        firebaseCredential = admin.credential.applicationDefault();
        console.log('ℹ️ Using Google Cloud Application Default Credentials.');
      }
    }
  }
} catch (err) {
  console.error('🔥 Firebase Credential Config Error:', err.message);
}

// Global initialization check
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: firebaseCredential,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
}

module.exports = {
  admin: admin,
  db: admin.firestore(),
  auth: admin.auth(),
  rtdb: admin.database(),
  bucket: admin.storage().bucket()
};
