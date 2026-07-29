const { db, bucket } = require('../config/firebase');
const { reconcileAllCounters } = require('./maintenanceService');

/**
 * Service to handle periodic cleanup tasks.
 */

const cleanupExpiredStatuses = async () => {
  console.log('[CRON] Starting expired statuses cleanup...');
  const now = new Date().toISOString();
  let deletedCount = 0;
  let filesCount = 0;

  try {
    // 1. Get expired statuses from Firestore
    const expiredSnap = await db.collection('statuses')
      .where('expires_at', '<', now)
      .get();

    if (expiredSnap.empty) {
      console.log('[CRON] No expired statuses found.');
      return;
    }

    const batch = db.batch();

    for (const doc of expiredSnap.docs) {
      const data = doc.data();

      // 2. Delete media from Storage if it exists
      if (data.media_url) {
        try {
          // Path format in storage is "statuses/userId/filename" or just "filename" depending on upload source
          // Our controllers use "userId/filename" stored in media_url
          const filePath = `statuses/${data.media_url}`;
          const file = bucket.file(filePath);
          const [exists] = await file.exists();

          if (exists) {
            await file.delete();
            filesCount++;
          }
        } catch (storageErr) {
          console.error(`[CRON] Error deleting file for status ${doc.id}:`, storageErr.message);
        }
      }

      // 3. Delete likes associated with the status
      const likesSnap = await db.collection('status_likes').where('status_id', '==', doc.id).get();
      likesSnap.forEach(likeDoc => {
        batch.delete(likeDoc.ref);
      });

      // 4. Queue status deletion
      batch.delete(doc.ref);
      deletedCount++;
    }

    // 5. Commit all Firestore deletions
    await batch.commit();

    console.log(`[CRON] Cleanup finished. Deleted ${deletedCount} statuses and ${filesCount} files.`);
  } catch (error) {
    console.error('[CRON] Critical error during cleanup:', error);
  }
};

/**
 * Deletes chat media (images/videos) older than 15 days from Storage.
 */
const cleanupExpiredChatMedia = async () => {
  console.log('[CRON] Starting chat media cleanup...');
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

  let deletedCount = 0;

  try {
    const [files] = await bucket.getFiles({ prefix: 'chats/' });

    for (const file of files) {
      const [metadata] = await file.getMetadata();
      const createdAt = new Date(metadata.timeCreated);

      if (createdAt < fifteenDaysAgo) {
        await file.delete();
        deletedCount++;
      }
    }

    console.log(`[CRON] Chat media cleanup finished. Deleted ${deletedCount} expired files.`);
  } catch (error) {
    console.error('[CRON] Error during chat media cleanup:', error.message);
  }
};

/**
 * Checks for expired security timers and triggers alerts.
 */
const processSecurityAlerts = async () => {
  const now = new Date().toISOString();
  try {
    const snapshot = await db.collection('security_logs')
      .where('status', '==', 'PENDING')
      .where('expires_at', '<=', now)
      .get();

    if (snapshot.empty) return;

    const batch = db.batch();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const contactCount = Array.isArray(data.contacts) ? data.contacts.length : 0;
      console.warn(`🚨 [SENTINEL] Alert triggered for user ${data.user_id} (${data.user_name}). Notifying ${contactCount} contacts.`);

      batch.update(doc.ref, {
        status: 'INCIDENT_TRIGGERED',
        triggered_at: now
      });

      // Logic to send actual SMS/WhatsApp to each contact in data.contacts would go here
    }
    await batch.commit();
  } catch (error) {
    console.error('[CRON] Error processing security alerts:', error.message);
  }
};

/**
 * Initializes all periodic background tasks.
 * Runs every hour.
 */
const initCronJobs = () => {
  console.log('⏰ Background services initialized (Cleanup Tasks).');

  // Run once on startup
  cleanupExpiredStatuses();
  cleanupExpiredChatMedia();
  reconcileAllCounters();
  processSecurityAlerts();

  // Frequent interval for security alerts (every 1 minute)
  setInterval(() => {
    processSecurityAlerts();
  }, 60000);

  // Hourly interval for maintenance
  setInterval(() => {
    cleanupExpiredStatuses();
    cleanupExpiredChatMedia();
    reconcileAllCounters();
  }, 3600000);
};

module.exports = { cleanupExpiredStatuses, cleanupExpiredChatMedia, initCronJobs, processSecurityAlerts };
