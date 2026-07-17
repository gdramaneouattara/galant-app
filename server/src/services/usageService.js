const { db } = require('../config/firebase');

/**
 * Checks if a user has purchased a specific interaction (DM or Rose Note)
 */
const hasDirectMessagePurchase = async (userId, targetUserId) => {
  if (!userId || !targetUserId) return false;
  try {
    const snapshot = await db.collection('purchased_interactions')
      .where('user_id', '==', userId)
      .where('target_id', '==', targetUserId)
      .where('interaction_type', 'in', ['DIRECT_MESSAGE', 'ROSE_NOTE_UNLOCK'])
      .limit(1)
      .get();

    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking DM purchase:', error);
    return false;
  }
};

/**
 * Gets daily usage stats for a user and action type
 */
const getDailyUsage = async (userId, type) => {
  const date = new Date().toISOString().split('T')[0];
  try {
    const snapshot = await db.collection('daily_usage')
      .where('user_id', '==', userId)
      .where('action_type', '==', type)
      .where('action_date', '==', date)
      .limit(1)
      .get();

    if (snapshot.empty) return { usage_count: 0, usage_seconds: 0 };
    return snapshot.docs[0].data();
  } catch (error) {
    console.error('Error getting daily usage:', error);
    return { usage_count: 0, usage_seconds: 0 };
  }
};

/**
 * Increments daily usage count
 */
const incrementUsage = async (userId, type, seconds = 0) => {
  const date = new Date().toISOString().split('T')[0];
  try {
    const usageRef = db.collection('daily_usage');
    const snapshot = await usageRef
      .where('user_id', '==', userId)
      .where('action_type', '==', type)
      .where('action_date', '==', date)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      await doc.ref.update({
        usage_count: (data.usage_count || 0) + 1,
        usage_seconds: (data.usage_seconds || 0) + seconds
      });
    } else {
      await usageRef.add({
        user_id: userId,
        action_type: type,
        action_date: date,
        usage_count: 1,
        usage_seconds: seconds,
        created_at: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error incrementing usage:', error);
  }
};

module.exports = { hasDirectMessagePurchase, getDailyUsage, incrementUsage };
