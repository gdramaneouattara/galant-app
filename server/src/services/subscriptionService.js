const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { PLAN_DURATIONS, BOOST_SCORES, QUOTAS } = require('../config/constants');
const { getCurrentPricing } = require('./pricingService');
const { createInternalNotification, NOTIFICATION_TYPES } = require('./notificationCenterService');

const SUBSCRIPTION_RENEWAL_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

const createNotificationSafely = (payload) => {
  void createInternalNotification(payload).catch((error) => {
    console.warn('[subscription] notification_failed', error.message);
  });
};

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
  let paymentNotification = null;
  const existingPurchaseSnapshot = reference
    ? await db.collection('purchased_interactions').where('reference', '==', reference).limit(1).get()
    : null;
  if (existingPurchaseSnapshot && !existingPurchaseSnapshot.empty) {
    return { already_processed: true };
  }

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
    paymentNotification = {
      title: normalizedType === 'PARTNER_PREMIUM' ? 'Compte partenaire active' : 'Privilege active',
      message: `Votre abonnement ${normalizedPlanId || 'Premium'} est actif.`,
      next_route: normalizedType === 'PARTNER_PREMIUM' ? '/partner' : '/profile'
    };

  } else if (normalizedType === 'BOOST') {
    const boostDurationMs = (normalizedPlanId === '7D' ? 7 : normalizedPlanId === '3D' ? 3 : 1) * 24 * 3600 * 1000;
    const boostedUntil = new Date(Date.now() + boostDurationMs).toISOString();
    const boostScore = BOOST_SCORES[normalizedPlanId] || 500;

    await db.collection('profiles').doc(userId).update({
      boosted_until: boostedUntil,
      boost_score: boostScore
    });
    paymentNotification = {
      title: 'Boost active',
      message: `Votre boost ${normalizedPlanId || 'Galant'} est actif.`,
      next_route: '/boost'
    };

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
    paymentNotification = {
      title: 'Interaction debloquee',
      message: 'Votre achat est confirme. Vous pouvez continuer.',
      next_route: '/profile'
    };

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
    paymentNotification = {
      title: "Rose d'Or activee",
      message: "Votre visibilite prioritaire est active pendant 3 heures.",
      next_route: '/boost'
    };
  } else if (normalizedType === 'ROSE_PACK') {
    const pricing = await getCurrentPricing();
    const pack = pricing.ROSE_PACKS?.[normalizedPlanId];
    const quantity = Number(pack?.quantity || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('invalid_rose_pack');
    }

    const now = new Date().toISOString();
    const safeReference = reference ? String(reference).replace(/[^a-zA-Z0-9_-]/g, '_') : '';
    const profileRef = db.collection('profiles').doc(userId);
    const purchaseRef = safeReference
      ? db.collection('purchased_interactions').doc(`payment_${safeReference}`)
      : db.collection('purchased_interactions').doc();

    await db.runTransaction(async (tx) => {
      if (safeReference) {
        const existingPurchase = await tx.get(purchaseRef);
        if (existingPurchase.exists) return;
      }

      tx.set(purchaseRef, {
        user_id: userId,
        interaction_type: 'ROSE_PACK',
        plan_id: normalizedPlanId,
        reference,
        quantity,
        price_amount: pack.amount,
        provider: paymentMethod,
        created_at: now
      });
      tx.update(profileRef, {
        rose_balance: FieldValue.increment(quantity),
        updated_at: now
      });
    });
    paymentNotification = {
      title: 'Roses ajoutees',
      message: `${quantity} rose${quantity > 1 ? 's' : ''} ajoutee${quantity > 1 ? 's' : ''} a votre solde.`,
      next_route: '/profile'
    };
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
    paymentNotification = {
      title: 'Story debloquee',
      message: 'Votre publication de story est debloquee.',
      next_route: '/stories'
    };
  } else if (normalizedType === 'LIKES_INBOX_2H') {
    const expiresAt = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
    await db.collection('profiles').doc(userId).update({
      likes_unlocked_until: expiresAt
    });
    paymentNotification = {
      title: 'Likes debloques',
      message: 'Votre boite des likes est ouverte pendant 2 heures.',
      next_route: '/likes'
    };
  } else if (normalizedType === 'DISCOVER_GRID_UNLOCK') {
    const pricing = await getCurrentPricing();
    const quota = pricing.PRICES.GRID_QUOTA || 100;

    await db.collection('profiles').doc(userId).update({
      grid_consultations_remaining: FieldValue.increment(quota),
      is_grid_unlocked: true, // Legacy flag if needed
      updated_at: new Date().toISOString()
    });
    paymentNotification = {
      title: 'Grille decouverte debloquee',
      message: 'Votre quota de decouverte en grille a ete ajoute.',
      next_route: '/discover-grid'
    };
  } else if (normalizedType === 'PARTNER_DISCOVERY_UNLOCK') {
    const pricing = await getCurrentPricing();
    await db.collection('purchased_interactions').add({
      user_id: userId,
      interaction_type: 'PARTNER_DISCOVERY_UNLOCK',
      reference,
      price_amount: pricing.PRICES.PARTNER_DISCOVERY_UNLOCK,
      provider: paymentMethod,
      created_at: new Date().toISOString()
    });

    await db.collection('profiles').doc(userId).update({
      partner_discovery_unlocked: true,
      partner_discovery_unlocked_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    paymentNotification = {
      title: 'Partenaires autour de moi debloque',
      message: 'La recherche de partenaires proches est maintenant disponible.',
      next_route: '/partner-discovery'
    };
  }

  if (paymentNotification) {
    createNotificationSafely({
      userId,
      type: NOTIFICATION_TYPES.PAYMENT_SUCCESS,
      title: paymentNotification.title,
      message: paymentNotification.message,
      targetId: reference || normalizedType,
      metadata: {
        payment_reference: reference || null,
        purchase_type: normalizedType,
        plan_id: normalizedPlanId || null,
        payment_method: paymentMethod || null,
        next_route: paymentNotification.next_route
      },
      dedupeKey: `payment_success_${userId}_${reference || `${normalizedType}_${Date.now()}`}`,
      sendPush: true,
      pushData: { type: 'PAYMENT_SUCCESS', reference: reference || '', purchaseType: normalizedType }
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
