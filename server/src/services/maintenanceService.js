const { db } = require('../config/firebase');
const { buildProfileGeohashUpdate } = require('../utils/geohash');

/**
 * Recalculates likes_count and roses_count for all profiles
 * based on actual documents in the 'likes' collection.
 */
const reconcileAllCounters = async () => {
  console.log('[MAINTENANCE] Starting global counters reconciliation...');
  try {
    const profilesSnap = await db.collection('profiles').get();
    const profiles = profilesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const likesSnap = await db.collection('likes').get();
    const allLikes = likesSnap.docs.map(doc => doc.data());

    const batch = db.batch();
    let updatedCount = 0;

    for (const profile of profiles) {
      const receivedLikes = allLikes.filter(l => l.liked_id === profile.id);
      const standardLikesCount = receivedLikes.filter(l => !l.is_super_like).length;
      const superLikesCount = receivedLikes.filter(l => !!l.is_super_like).length;

      // Only update if counts are different or missing
      if (profile.likes_count !== standardLikesCount || profile.roses_count !== superLikesCount) {
        const ref = db.collection('profiles').doc(profile.id);
        batch.update(ref, {
          likes_count: standardLikesCount,
          roses_count: superLikesCount,
          updated_at: new Date().toISOString()
        });
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      await batch.commit();
    }

    console.log(`[MAINTENANCE] Finished. Processed ${profiles.length} profiles, updated ${updatedCount}.`);
    return { processed: profiles.length, updated: updatedCount };
  } catch (error) {
    console.error('[MAINTENANCE] Counter reconciliation failed:', error.message);
    throw error;
  }
};

const backfillProfileGeohashes = async () => {
  console.log('[MAINTENANCE] Starting profile geohash backfill...');
  try {
    const profilesSnap = await db.collection('profiles').get();
    let batch = db.batch();
    let pendingWrites = 0;
    let processed = 0;
    let updated = 0;

    for (const doc of profilesSnap.docs) {
      processed++;
      const profile = doc.data();
      const latitude = Number(profile.latitude);
      const longitude = Number(profile.longitude);
      const geohashUpdate = buildProfileGeohashUpdate(latitude, longitude);

      if (!geohashUpdate.geohash || profile.geohash === geohashUpdate.geohash) continue;

      batch.update(doc.ref, {
        ...geohashUpdate,
        updated_at: new Date().toISOString()
      });
      pendingWrites++;
      updated++;

      if (pendingWrites >= 450) {
        await batch.commit();
        batch = db.batch();
        pendingWrites = 0;
      }
    }

    if (pendingWrites > 0) {
      await batch.commit();
    }

    console.log(`[MAINTENANCE] Geohash backfill finished. Processed ${processed}, updated ${updated}.`);
    return { processed, updated };
  } catch (error) {
    console.error('[MAINTENANCE] Geohash backfill failed:', error.message);
    throw error;
  }
};

module.exports = { reconcileAllCounters, backfillProfileGeohashes };
