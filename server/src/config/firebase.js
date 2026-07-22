const admin = require('firebase-admin');
require('dotenv').config();

/**
 * FIREBASE ADMIN INITIALIZATION
 * Ultra-robust pattern to prevent startup crashes on Cloud Run.
 */

const initFirebase = () => {
  // If already initialized, stop here
  if (admin.apps.length > 0) return admin.app();

  const config = {
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  };

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log('ℹ️ Initializing with Service Account from ENV');
      config.credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
    } else {
      try {
        // Try local file first
        const serviceAccount = require('../../firebase-service-account.json');
        console.log('✅ Initializing with local JSON file');
        config.credential = admin.credential.cert(serviceAccount);
      } catch (e) {
        // Cloud Run environment: Admin SDK will automatically find credentials
        console.log('ℹ️ Local file missing, using Environment Default Credentials');
      }
    }

    return admin.initializeApp(config);
  } catch (error) {
    console.error('⚠️ Firebase Initialization warning (will try default):', error.message);
    // Last resort: initialize without explicit credentials (ADC will take over)
    return admin.initializeApp();
  }
};

// Execute initialization
const app = initFirebase();

module.exports = {
  admin,
  db: app.firestore(),
  auth: app.auth(),
  rtdb: app.database(),
  bucket: app.storage().bucket()
};
