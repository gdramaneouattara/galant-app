const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');
const crypto = require('crypto');

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

const userPurchasedInteractionsQuery = (userId) => db.collection('purchased_interactions')
  .where('user_id', '==', userId);

const manualPaymentLedgerId = (reference = '') => `payment_${crypto.createHash('sha256').update(String(reference)).digest('hex')}`;
const storyManualPaymentReference = (payment, docId) => `wave_${payment.reference_code || docId}`;

const getStoryPurchaseDocs = async (userId, tx = null) => {
  if (!userId) return [];
  const query = userPurchasedInteractionsQuery(userId);
  const snapshot = tx ? await tx.get(query) : await query.get();
  return snapshot.docs.filter((row) => row.data()?.interaction_type === 'STORY_UPLOAD');
};

const getUnusedStoryPurchaseDoc = async (userId, tx = null) => {
  if (!userId) return null;
  const docs = await getStoryPurchaseDocs(userId, tx);
  return docs.find((row) => row.data()?.status === 'UNUSED') || null;
};

const getApprovedStoryManualPaymentDocs = async (userId, tx = null) => {
  if (!userId) return [];
  const query = db.collection('manual_payments').where('user_id', '==', userId);
  const snapshot = tx ? await tx.get(query) : await query.get();
  return snapshot.docs.filter((row) => {
    const item = row.data() || {};
    return item.status === 'APPROVED' && item.type === 'STORY_UPLOAD';
  });
};

const buildStoryPurchaseFromManualPayment = (payment, docId, nowIso, status = 'UNUSED') => {
  const reference = storyManualPaymentReference(payment, docId);
  return {
    ref: db.collection('purchased_interactions').doc(manualPaymentLedgerId(reference)),
    payload: {
      user_id: payment.user_id,
      interaction_type: 'STORY_UPLOAD',
      status,
      price_amount: payment.amount || 500,
      provider: payment.provider || 'WAVE_MANUAL',
      reference,
      entitlement_status: 'APPLIED',
      created_at: payment.approved_at || payment.updated_at || nowIso,
      updated_at: nowIso,
      repaired_from_manual_payment: docId
    }
  };
};

const repairUnusedStoryPurchaseFromApprovedPayment = async (userId) => {
  const nowIso = new Date().toISOString();
  const payments = await getApprovedStoryManualPaymentDocs(userId);

  for (const row of payments) {
    const payment = row.data() || {};
    const { ref, payload } = buildStoryPurchaseFromManualPayment(payment, row.id, nowIso, 'UNUSED');
    const existing = await ref.get();
    if (existing.exists) {
      const item = existing.data() || {};
      if (item.interaction_type === 'STORY_UPLOAD' && item.status === 'UNUSED') return true;
      continue;
    }

    await ref.set(payload);
    return true;
  }

  return false;
};

/**
 * Checks if a user has an unused story upload purchase
 */
const consumeStoryPurchase = async (userId) => {
  if (!userId) return false;
  try {
    const doc = await getUnusedStoryPurchaseDoc(userId);
    if (!doc) return false;

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

const consumeStoryPurchaseInTransaction = async (tx, userId, nowIso = new Date().toISOString()) => {
  if (!tx || !userId) return false;
  const doc = await getUnusedStoryPurchaseDoc(userId, tx);
  if (doc) {
    tx.update(doc.ref, {
      status: 'USED',
      consumed_at: nowIso
    });
    return true;
  }

  const approvedPayments = await getApprovedStoryManualPaymentDocs(userId, tx);
  for (const row of approvedPayments) {
    const payment = row.data() || {};
    const { ref, payload } = buildStoryPurchaseFromManualPayment(payment, row.id, nowIso, 'USED');
    const existing = await tx.get(ref);
    if (existing.exists) continue;

    tx.set(ref, {
      ...payload,
      consumed_at: nowIso
    });
    return true;
  }

  return false;
};

const hasUnusedStoryPurchase = async (userId) => {
  if (!userId) return false;
  try {
    return !!(await getUnusedStoryPurchaseDoc(userId)) || await repairUnusedStoryPurchaseFromApprovedPayment(userId);
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
    const docs = await getStoryPurchaseDocs(userId);

    const hasAccess = docs.some((row) => {
      const item = row.data();
      const status = String(item.status || '').toUpperCase();
      if (status === 'UNUSED') return true;
      if (status !== 'USED') return false;
      const accessDate = new Date(item.consumed_at || item.created_at || 0).getTime();
      return Number.isFinite(accessDate) && now - accessDate <= accessWindowMs;
    });
    return hasAccess || await repairUnusedStoryPurchaseFromApprovedPayment(userId);
  } catch (error) {
    console.error('Error checking story access purchase:', error);
    return false;
  }
};

module.exports = {
  hasDirectMessagePurchase,
  getDailyUsage,
  incrementUsage,
  consumeStoryPurchase,
  consumeStoryPurchaseInTransaction,
  repairUnusedStoryPurchaseFromApprovedPayment,
  hasUnusedStoryPurchase,
  hasStoryPurchaseAccess
};
