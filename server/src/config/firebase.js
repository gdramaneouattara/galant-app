const admin = require('firebase-admin');
require('dotenv').config();

/**
 * PRODUCTION-READY FIREBASE INITIALIZATION
 * Standard pattern for Google Cloud Run (Node 22).
 */

if (!admin.apps.length) {
  const config = {};

  // URL de la base de données (Nécessaire pour Realtime DB)
  if (process.env.FIREBASE_DATABASE_URL) {
    config.databaseURL = process.env.FIREBASE_DATABASE_URL;
  }

  // Bucket de stockage
  if (process.env.FIREBASE_STORAGE_BUCKET) {
    config.storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  }

  // Identifiants
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      config.credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
      console.log('✅ Initialized with Service Account from ENV');
    } catch (e) {
      console.error('❌ Error parsing Service Account:', e.message);
    }
  }
  // Sur Cloud Run, si pas de credential, admin.initializeApp()
  // utilise automatiquement les droits du projet sans rien demander.

  admin.initializeApp(config);
  console.log('🚀 Firebase Admin instance created.');
}

module.exports = {
  admin,
  db: admin.firestore(),
  auth: admin.auth(),
  rtdb: admin.database(),
  bucket: admin.storage().bucket()
};
