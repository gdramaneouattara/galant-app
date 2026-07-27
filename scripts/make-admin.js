const admin = require('firebase-admin');
const path = require('path');

// Usage: node scripts/make-admin.js <UID>

const uid = process.argv[2];

if (!uid) {
  console.error('Usage: node scripts/make-admin.js <UID>');
  process.exit(1);
}

// Initialisation avec le fichier de clé de service
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function makeAdmin(userId) {
  try {
    const profileRef = db.collection('profiles').doc(userId);
    const doc = await profileRef.get();

    if (!doc.exists) {
      console.error(`User with UID ${userId} not found.`);
      process.exit(1);
    }

    await profileRef.update({
      is_admin: true,
      updated_at: new Date().toISOString()
    });

    console.log(`Success: User ${userId} is now an ADMIN.`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

makeAdmin(uid);
