const { db } = require('../config/firebase');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { PLAN_DURATIONS, BOOST_SCORES } = require('../config/constants');
const { getCurrentPricing } = require('./pricingService');

const SUBSCRIPTION_RENEWAL_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

const getGoogleAccessToken = async () => {
  try {
    const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      throw new Error('missing_google_service_account_config');
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      sub: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
    };

    const token = jwt.sign(payload, GOOGLE_PRIVATE_KEY, { algorithm: 'RS256' });

    const response = await axios.post('https://oauth2.googleapis.com/token',
      `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${token}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    return response.data.access_token;
  } catch (error) {
    console.error('Google Auth Error:', error.message);
    throw new Error('google_auth_failed');
  }
};

const verifyGooglePlayPurchase = async ({ productId, purchaseToken }) => {
  const ANDROID_PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME || 'com.ouattara.galant';
  try {
    const accessToken = await getGoogleAccessToken();
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${ANDROID_PACKAGE_NAME}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`;

    // Tentative en tant qu'abonnement
    try {
      const response = await axios.get(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      return {
        valid: response.data.paymentState === 1 || response.data.paymentState === 0,
        autoRenewing: response.data.autoRenewing,
        raw: response.data
      };
    } catch (e) {
      // Tentative en tant que produit consommant (One-time purchase)
      const productUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${ANDROID_PACKAGE_NAME}/purchases/products/${productId}/tokens/${purchaseToken}`;
      const productRes = await axios.get(productUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      return {
        valid: productRes.data.purchaseState === 0,
        autoRenewing: false,
        raw: productRes.data
      };
    }
  } catch (error) {
    console.error('Google Verification Error:', error.message);
    return { valid: false, reason: 'api_error' };
  }
};

const verifyApplePurchase = async ({ transactionId }) => {
  // Simple validation mock for now or real App Store Server API call
  return { valid: true, autoRenewing: null };
};

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
    const pricing = await getCurrentPricing();
    await db.collection('purchased_interactions').add({
      user_id: userId,
      interaction_type: normalizedType,
      target_id: targetId,
      reference,
      price_amount: pricing.PRICES[normalizedType],
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
    const pricing = await getCurrentPricing();
    await db.collection('purchased_interactions').add({
      user_id: userId,
      interaction_type: 'STORY_UPLOAD',
      status: 'UNUSED',
      reference,
      price_amount: pricing.PRICES.STORY_UPLOAD,
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
