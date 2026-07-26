const { db } = require('../config/firebase');

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

module.exports = { reconcileAllCounters };
