const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

const todayKey = () => new Date().toISOString().split('T')[0];
const usageDocId = (userId, type, date = todayKey()) => (
  `${String(userId).replace(/[^a-zA-Z0-9_-]/g, '_')}_${String(type).replace(/[^a-zA-Z0-9_-]/g, '_')}_${date}`
);

/**
 * Checks if a user has purchased a specific interaction (DM or Rose Note)
 */
const hasDirectMessagePurchase = async (userId, targetUserId) => {
  if (!userId || !targetUserId) return false;
  try {
    const snapshot = await db.collection('purchased_interactions')
      .where('user_id', '==', userId)
      .limit(80)
      .get();

    return snapshot.docs.some((doc) => {
      const item = doc.data();
      return item.target_id === targetUserId &&
        ['DIRECT_MESSAGE', 'ROSE_NOTE_UNLOCK'].includes(item.interaction_type);
    });
  } catch (error) {
    console.error('Error checking DM purchase:', error);
    return false;
  }
};

/**
 * Gets daily usage stats for a user and action type
 */
const getDailyUsage = async (userId, type) => {
  const date = todayKey();
  try {
    const doc = await db.collection('daily_usage').doc(usageDocId(userId, type, date)).get();
    if (!doc.exists) return { usage_count: 0, usage_seconds: 0 };
    return doc.data();
  } catch (error) {
    console.error('Error getting daily usage:', error);
    return { usage_count: 0, usage_seconds: 0 };
  }
};

/**
 * Increments daily usage count
 */
const incrementUsage = async (userId, type, seconds = 0) => {
  const date = todayKey();
  try {
    await db.collection('daily_usage').doc(usageDocId(userId, type, date)).set({
      user_id: userId,
      action_type: type,
      action_date: date,
      usage_count: FieldValue.increment(1),
      usage_seconds: FieldValue.increment(seconds),
      updated_at: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error incrementing usage:', error);
  }
};

/**
 * Checks if a user has an unused story upload purchase
 */
const consumeStoryPurchase = async (userId) => {
  if (!userId) return false;
  try {
    const snapshot = await db.collection('purchased_interactions')
      .where('user_id', '==', userId)
      .limit(80)
      .get();

    const doc = snapshot.docs.find((row) => {
      const item = row.data();
      return item.interaction_type === 'STORY_UPLOAD' && item.status === 'UNUSED';
    });
    if (!doc) return false;

    // Consume it
    await doc.ref.update({
      status: 'USED',
      consumed_at: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Error consuming story purchase:', error);
    return false;
  }
};

const hasUnusedStoryPurchase = async (userId) => {
  if (!userId) return false;
  try {
    const snapshot = await db.collection('purchased_interactions')
      .where('user_id', '==', userId)
      .limit(80)
      .get();

    return snapshot.docs.some((row) => {
      const item = row.data();
      return item.interaction_type === 'STORY_UPLOAD' && item.status === 'UNUSED';
    });
  } catch (error) {
    console.error('Error checking story purchase:', error);
    return false;
  }
};

const hasStoryPurchaseAccess = async (userId) => {
  if (!userId) return false;
  try {
    const now = Date.now();
    const accessWindowMs = 24 * 3600 * 1000;
    const snapshot = await db.collection('purchased_interactions')
      .where('user_id', '==', userId)
      .limit(80)
      .get();

    return snapshot.docs.some((row) => {
      const item = row.data();
      if (item.interaction_type !== 'STORY_UPLOAD') return false;
      const status = String(item.status || '').toUpperCase();
      if (status === 'UNUSED') return true;
      if (status !== 'USED') return false;
      const accessDate = new Date(item.consumed_at || item.created_at || 0).getTime();
      return Number.isFinite(accessDate) && now - accessDate <= accessWindowMs;
    });
  } catch (error) {
    console.error('Error checking story access purchase:', error);
    return false;
  }
};

module.exports = { hasDirectMessagePurchase, getDailyUsage, incrementUsage, consumeStoryPurchase, hasUnusedStoryPurchase, hasStoryPurchaseAccess };
