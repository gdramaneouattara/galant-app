const admin = require('firebase-admin');
require('dotenv').config();

/**
 * ULTRA-SAFE FIREBASE INITIALIZATION
 * Designed to never crash the main process even if config fails.
 */

let app;
try {
  if (admin.apps.length === 0) {
    const config = {
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    };

    // Use Service Account if provided, otherwise let Google handle it automatically
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      config.credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
    }

    app = admin.initializeApp(config);
    console.log('✅ Firebase initialized successfully.');
  } else {
    app = admin.app();
  }
} catch (error) {
  console.error('⚠️ Firebase Init Warning (Non-Fatal):', error.message);
}

// Export with safety checks
module.exports = {
  admin,
  db: app ? app.firestore() : null,
  auth: app ? app.auth() : null,
  rtdb: app ? app.database() : null,
  bucket: app ? app.storage().bucket() : null
};
