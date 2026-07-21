const { db } = require('../config/firebase');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { PLAN_DURATIONS, PRICES, BOOST_SCORES } = require('../config/constants');

const SUBSCRIPTION_RENEWAL_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

// ... Google/Apple configs stay the same ...

const getLatestActiveSubscriptionForUser = async (userId) => {
  try {
    const now = new Date().toISOString();
    const snapshot = await db.collection('subscriptions')
      .where('user_id', '==', userId)
      .where('status', '==', 'active')
      .where('current_period_end', '>', now)
      .orderBy('current_period_end', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error fetching latest active sub:', error);
    return null;
  }
};

const getLatestRenewableSubscriptionForUser = async (userId) => {
  try {
    const snapshot = await db.collection('subscriptions')
      .where('user_id', '==', userId)
      .where('payment_method', 'in', ['GOOGLE_PLAY', 'APPLE_STORE'])
      .orderBy('current_period_end', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    return null;
  }
};

// ... getGoogleAccessToken, verifyGooglePlayPurchase, etc. stay same as they are API calls ...

const applyPurchasedEntitlement = async ({
  userId,
  planId,
  type,
  targetId,
  reference,
  paymentMethod,
  purchaseMeta = {},
  note = null,
}) => {
  const normalizedType = String(type || '').toUpperCase();
  const normalizedPlanId = String(planId || '').toUpperCase();

  if (normalizedType === 'PREMIUM' || normalizedType === 'PARTNER_PREMIUM') {
    const durationDays = PLAN_DURATIONS[normalizedPlanId] || 30;
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + durationDays);

    const isVip = ['BIANNUAL', 'ANNUAL', 'PRESTIGE'].includes(normalizedPlanId);

    // 1. Create Subscription document
    await db.collection('subscriptions').add({
      user_id: userId,
      plan_id: normalizedPlanId,
      status: 'active',
      payment_method: paymentMethod,
      current_period_start: now.toISOString(),
      current_period_end: end.toISOString(),
      auto_renewing: purchaseMeta.autoRenewing ?? null,
      created_at: now.toISOString(),
    });

    // 2. Update Profile
    const profileUpdate = { is_premium: true };
    if (isVip) profileUpdate.is_vip = true;
    if (normalizedType === 'PARTNER_PREMIUM') profileUpdate.is_partner = true;

    await db.collection('profiles').doc(userId).update(profileUpdate);

  } else if (normalizedType === 'BOOST') {
    const boostDurationMs = (normalizedPlanId === '7D' ? 7 : normalizedPlanId === '3D' ? 3 : 1) * 24 * 3600 * 1000;
    const boostedUntil = new Date(Date.now() + boostDurationMs).toISOString();
    const boostScore = BOOST_SCORES[normalizedPlanId] || 500;

    await db.collection('profiles').doc(userId).update({
      boosted_until: boostedUntil,
      boost_score: boostScore
    });

  } else if (['SUPER_LIKE', 'DIRECT_MESSAGE', 'ROSE_NOTE_UNLOCK'].includes(normalizedType)) {
    await db.collection('purchased_interactions').add({
      user_id: userId,
      interaction_type: normalizedType,
      target_id: targetId,
      reference,
      price_amount: PRICES[normalizedType],
      provider: paymentMethod,
      created_at: new Date().toISOString()
    });

  } else if (normalizedType === 'GOLDEN_ROSE') {
    const expiresAt = new Date(Date.now() + 3 * 3600 * 1000).toISOString();
    await db.collection('golden_roses').add({
      user_id: userId,
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    });
    await db.collection('profiles').doc(userId).update({
      golden_rose_until: expiresAt
    });
  } else if (normalizedType === 'STORY_UPLOAD') {
    await db.collection('purchased_interactions').add({
      user_id: userId,
      interaction_type: 'STORY_UPLOAD',
      status: 'UNUSED',
      reference,
      price_amount: PRICES.STORY_UPLOAD,
      provider: paymentMethod,
      created_at: new Date().toISOString()
    });
  }

  return { success: true };
};

const refreshSubscriptionAutoRenewalForUser = async (userId) => {
  const sub = await getLatestRenewableSubscriptionForUser(userId);
  if (!sub) return null;

  // Implement refresh logic based on payment method
  // ... (re-verify with Google/Apple using stored tokens)
  return sub;
};

module.exports = {
  getLatestActiveSubscriptionForUser,
  getLatestRenewableSubscriptionForUser,
  refreshSubscriptionAutoRenewalForUser,
  verifyGooglePlayPurchase,
  verifyApplePurchase,
  applyPurchasedEntitlement
};
