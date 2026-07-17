const cron = require('node-cron');
const { db, bucket } = require('../config/firebase');
const { sendPushNotification } = require('./notificationService');

const initCronJobs = () => {
  // Task 1: Cleanup expired venue events
  cron.schedule('0 3 * * *', async () => {
    console.log('Running daily cleanup: Expired Venue Events');
    try {
      const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
      const snapshot = await db.collection('venue_events')
        .where('expires_at', '<', twoDaysAgo)
        .get();

      if (!snapshot.empty) {
        for (const doc of snapshot.docs) {
          const event = doc.data();
          if (event.photo_url && bucket) {
             // Basic attempt to delete from storage if possible
             try {
                const parts = event.photo_url.split('/');
                const filename = parts[parts.length - 1].split('?')[0];
                if (filename) await bucket.file(`photos/${filename}`).delete();
             } catch {}
          }
          await doc.ref.delete();
        }
        console.log(`${snapshot.size} expired events cleaned up.`);
      }
    } catch (e) {
      console.error('Cleanup task failed:', e);
    }
  });

  // Task 2: Subscription Reminders
  cron.schedule('0 10 * * *', async () => {
    console.log('Running daily task: Subscription Reminders');
    try {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      const isoDate = threeDaysFromNow.toISOString().split('T')[0];

      const snapshot = await db.collection('subscriptions')
        .where('status', '==', 'active')
        .where('current_period_end', '>=', `${isoDate}T00:00:00Z`)
        .where('current_period_end', '<=', `${isoDate}T23:59:59Z`)
        .get();

      snapshot.forEach(doc => {
        const sub = doc.data();
        void sendPushNotification(
          sub.user_id,
          "Privilège Galant 🌹",
          "Votre adhésion arrive à son terme dans 3 jours.",
          { type: 'PREMIUM_RENEWAL' }
        );
      });
    } catch (e) {
      console.error('Subscription reminder task failed:', e);
    }
  });

  // Task 3: Cleanup expired stories (24h)
  cron.schedule('0 * * * *', async () => {
    console.log('Running hourly cleanup: Expired Stories');
    try {
      const now = new Date().toISOString();
      const snapshot = await db.collection('statuses')
        .where('expires_at', '<=', now)
        .get();

      if (!snapshot.empty) {
        for (const doc of snapshot.docs) {
          const status = doc.data();

          // 1. Delete associated media from Storage
          if (status.media_url && bucket) {
            try {
              // status.media_url est le chemin relatif dans le bucket (ex: user_id/timestamp.jpg)
              await bucket.file(`statuses/${status.media_url}`).delete();
            } catch (storageError) {
              // On continue même si le fichier n'existe plus
            }
          }

          // 2. Delete likes associated with the status
          const likesSnap = await db.collection('status_likes').where('status_id', '==', doc.id).get();
          const batch = db.batch();
          likesSnap.forEach(lDoc => batch.delete(lDoc.ref));
          await batch.commit();

          // 3. Delete the status document
          await doc.ref.delete();
        }
        console.log(`${snapshot.size} expired stories cleaned up.`);
      }
    } catch (e) {
      console.error('Stories cleanup failed:', e);
    }
  });

  // Task 4: Cleanup old chat media (30 days)
  cron.schedule('0 4 * * *', async () => {
    console.log('Running daily cleanup: Old Chat Media (30 days)');
    if (!bucket) return;

    try {
      const [files] = await bucket.getFiles({ prefix: 'chat-media/' });
      const thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000;
      let deletedCount = 0;

      for (const file of files) {
        const [metadata] = await file.getMetadata();
        const createdAt = new Date(metadata.timeCreated).getTime();

        if (createdAt < thirtyDaysAgo) {
          await file.delete();
          deletedCount++;
        }
      }
      console.log(`${deletedCount} old chat media files deleted.`);
    } catch (e) {
      console.error('Chat media cleanup failed:', e);
    }
  });

  console.log('⏰ Cron jobs initialized.');
};

module.exports = { initCronJobs };
