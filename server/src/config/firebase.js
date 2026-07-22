const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

/**
 * FIREBASE ADMIN INITIALIZATION
 *
 * It requires a service account JSON file.
 * Go to Firebase Console > Project Settings > Service Accounts > Generate new private key.
 * Place it in server/firebase-service-account.json (ADD TO .GITIGNORE!)
 */

let credential;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // If the service account JSON is provided via environment variable (useful for CI/CD or specific setups)
  try {
    const serviceAccountData = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    credential = admin.credential.cert(serviceAccountData);
  } catch (e) {
    console.error('Error parsing FIREBASE_SERVICE_ACCOUNT env var:', e.message);
  }
} else {
  try {
    // Try to load from file (local development)
    serviceAccount = require('../../firebase-service-account.json');
    credential = admin.credential.cert(serviceAccount);
  } catch (e) {
    // Fallback to Application Default Credentials (for Cloud Run production)
    console.log('Firebase Service Account file missing, falling back to Application Default Credentials.');
    credential = admin.credential.applicationDefault();
  }
}

if (credential) {
  admin.initializeApp({
    credential,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
}

module.exports = {
  admin,
  db: admin ? admin.firestore() : null,
  auth: admin ? admin.auth() : null,
  rtdb: admin ? admin.database() : null,
  bucket: admin ? admin.storage().bucket() : null
};
