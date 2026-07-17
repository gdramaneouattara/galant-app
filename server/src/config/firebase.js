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

let serviceAccount;
try {
  serviceAccount = require('../../firebase-service-account.json');
} catch (e) {
  console.warn('Firebase Service Account file missing. Firebase Admin will not be initialized correctly.');
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
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
