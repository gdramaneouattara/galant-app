const admin = require('firebase-admin');
require('dotenv').config();

/**
 * FIREBASE ADMIN INITIALIZATION
 * Standard recommended pattern for Google Cloud Run.
 * It automatically finds credentials in the environment.
 */

try {
  if (admin.apps.length === 0) {
    // Si on a un compte de service en variable (Local/Dev), on l'utilise
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
      console.log('✅ Firebase initialized with Service Account from ENV');
    }
    // Sinon, on laisse Google Cloud Run gérer l'authentification tout seul (Production)
    else {
      admin.initializeApp({
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
      console.log('ℹ️ Firebase initialized with Application Default Credentials (Cloud Run)');
    }
  }
} catch (error) {
  console.error('🔥 Firebase Initialization Error:', error.message);
  // On ne bloque pas le démarrage du serveur pour que le port 8080 s'ouvre quand même
}

module.exports = {
  admin,
  db: admin.firestore(),
  auth: admin.auth(),
  rtdb: admin.database(),
  bucket: admin.storage().bucket()
};
