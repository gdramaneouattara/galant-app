const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PLAN_DURATIONS, BOOST_SCORES, QUOTAS } = require('../config/constants');
const { getCurrentPricing } = require('./pricingService');
const { createInternalNotification, NOTIFICATION_TYPES } = require('./notificationCenterService');

const SUBSCRIPTION_RENEWAL_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

const createNotificationSafely = (payload) => {
  void createInternalNotification(payload).catch((error) => {
    console.warn('[subscription] notification_failed', error.message);
  });
};

const paymentLedgerId = (reference = '') => `payment_${crypto.createHash('sha256').update(String(reference)).digest('hex')}`;

const runEntitlementOnce = async ({ reference, ledgerPayload, apply }) => {
  if (!reference) {
    await apply(null, new Date().toISOString());
    return { alreadyProcessed: false };
  }

  const ledgerRef = db.collection('purchased_interactions').doc(paymentLedgerId(reference));
  return db.runTransaction(async (tx) => {
    const existing = await tx.get(ledgerRef);
    if (existing.exists) {
      return { alreadyProcessed: true };
    }

    const now = new Date().toISOString();
    await apply(tx, now);
    tx.set(ledgerRef, {
      ...ledgerPayload,
      reference,
      entitlement_status: 'APPLIED',
      created_at: now,
      updated_at: now
    });
    return { alreadyProcessed: false };
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
      .limit(30)
      .get();

    const subscriptions = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(sub => sub.status === 'active' && (!sub.current_period_end || sub.current_period_end > now))
      .sort((left, right) => String(right.current_period_end || '').localeCompare(String(left.current_period_end || '')));

    return subscriptions[0] || null;
  } catch (error) {
    console.error('Error fetching latest active sub:', error);
    return null;
  }
};

const getLatestRenewableSubscriptionForUser = async (userId) => {
  try {
    const snapshot = await db.collection('subscriptions')
      .where('user_id', '==', userId)
      .limit(30)
      .get();

    const subscriptions = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(sub => ['GOOGLE_PLAY', 'APPLE_STORE'].includes(sub.payment_method))
      .sort((left, right) => String(right.current_period_end || '').localeCompare(String(left.current_period_end || '')));

    return subscriptions[0] || null;
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
    const isVip = ['BIANNUAL', 'ANNUAL', 'PRESTIGE'].includes(normalizedPlanId);
    const profileUpdate = { is_premium: true };
    if (isVip) profileUpdate.is_vip = true;
    if (normalizedType === 'PARTNER_PREMIUM') profileUpdate.is_partner = true;

    const result = await runEntitlementOnce({
      reference,
      ledgerPayload: {
        user_id: userId,
        interaction_type: normalizedType,
        plan_id: normalizedPlanId,
        target_id: targetId || null,
        provider: paymentMethod,
        metadata: purchaseMeta
      },
      apply: async (tx, nowIso) => {
        const now = new Date(nowIso);
        const end = new Date(now);
        end.setDate(end.getDate() + durationDays);
        const subscriptionRef = reference
          ? db.collection('subscriptions').doc(paymentLedgerId(reference))
          : db.collection('subscriptions').doc();
        const subscriptionPayload = {
          user_id: userId,
          plan_id: normalizedPlanId,
          status: 'active',
          payment_method: paymentMethod,
          current_period_start: now.toISOString(),
          current_period_end: end.toISOString(),
          auto_renewing: purchaseMeta.autoRenewing ?? null,
          created_at: now.toISOString(),
        };
        const profileRef = db.collection('profiles').doc(userId);
        if (tx) {
          tx.set(subscriptionRef, subscriptionPayload, { merge: true });
          tx.update(profileRef, profileUpdate);
        } else {
          await subscriptionRef.set(subscriptionPayload, { merge: true });
          await profileRef.update(profileUpdate);
        }
      }
    });
    if (result.alreadyProcessed) return { already_processed: true };
    paymentNotification = {
      title: normalizedType === 'PARTNER_PREMIUM' ? 'Compte partenaire active' : 'Privilege active',
      message: `Votre abonnement ${normalizedPlanId || 'Premium'} est actif.`,
      next_route: normalizedType === 'PARTNER_PREMIUM' ? '/partner' : '/profile'
    };

  } else if (normalizedType === 'BOOST') {
    const boostDurationMs = (normalizedPlanId === '7D' ? 7 : normalizedPlanId === '3D' ? 3 : 1) * 24 * 3600 * 1000;
    const boostScore = BOOST_SCORES[normalizedPlanId] || 500;
    const result = await runEntitlementOnce({
      reference,
      ledgerPayload: {
        user_id: userId,
        interaction_type: 'BOOST',
        plan_id: normalizedPlanId,
        target_id: targetId || null,
        provider: paymentMethod
      },
      apply: async (tx, nowIso) => {
        const boostedUntil = new Date(new Date(nowIso).getTime() + boostDurationMs).toISOString();
        const profileRef = db.collection('profiles').doc(userId);
        const payload = {
          boosted_until: boostedUntil,
          boost_score: boostScore
        };
        if (tx) tx.update(profileRef, payload);
        else await profileRef.update(payload);
      }
    });
    if (result.alreadyProcessed) return { already_processed: true };
    paymentNotification = {
      title: 'Boost active',
      message: `Votre boost ${normalizedPlanId || 'Galant'} est actif.`,
      next_route: '/boost'
    };

  } else if (['SUPER_LIKE', 'DIRECT_MESSAGE', 'ROSE_NOTE_UNLOCK'].includes(normalizedType)) {
    const pricing = await getCurrentPricing();
    const purchasePayload = {
      user_id: userId,
      interaction_type: normalizedType,
      target_id: targetId,
      price_amount: pricing.PRICES[normalizedType],
      provider: paymentMethod
    };
    const result = await runEntitlementOnce({
      reference,
      ledgerPayload: purchasePayload,
      apply: async (tx, nowIso) => {
        if (!tx) {
          await db.collection('purchased_interactions').add({
            ...purchasePayload,
            reference,
            created_at: nowIso
          });
        }
      }
    });
    if (result.alreadyProcessed) return { already_processed: true };
    paymentNotification = {
      title: 'Interaction debloquee',
      message: 'Votre achat est confirme. Vous pouvez continuer.',
      next_route: '/profile'
    };

  } else if (normalizedType === 'GOLDEN_ROSE') {
    const result = await runEntitlementOnce({
      reference,
      ledgerPayload: {
        user_id: userId,
        interaction_type: 'GOLDEN_ROSE',
        plan_id: normalizedPlanId || null,
        target_id: targetId || null,
        provider: paymentMethod
      },
      apply: async (tx, nowIso) => {
        const expiresAt = new Date(new Date(nowIso).getTime() + 3 * 3600 * 1000).toISOString();
        const goldenRoseRef = reference
          ? db.collection('golden_roses').doc(paymentLedgerId(reference))
          : db.collection('golden_roses').doc();
        const goldenRosePayload = {
          user_id: userId,
          expires_at: expiresAt,
          created_at: nowIso
        };
        const profileRef = db.collection('profiles').doc(userId);
        if (tx) {
          tx.set(goldenRoseRef, goldenRosePayload, { merge: true });
          tx.update(profileRef, { golden_rose_until: expiresAt });
        } else {
          await goldenRoseRef.set(goldenRosePayload, { merge: true });
          await profileRef.update({ golden_rose_until: expiresAt });
        }
      }
    });
    if (result.alreadyProcessed) return { already_processed: true };
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

    const profileRef = db.collection('profiles').doc(userId);
    const purchasePayload = {
        user_id: userId,
        interaction_type: 'ROSE_PACK',
        plan_id: normalizedPlanId,
        quantity,
        price_amount: pack.amount,
        provider: paymentMethod
      };
    const result = await runEntitlementOnce({
      reference,
      ledgerPayload: purchasePayload,
      apply: async (tx, nowIso) => {
        if (tx) {
          tx.update(profileRef, {
            rose_balance: FieldValue.increment(quantity),
            updated_at: nowIso
          });
        } else {
          await db.collection('purchased_interactions').add({
            ...purchasePayload,
            reference,
            created_at: nowIso
          });
          await profileRef.update({
            rose_balance: FieldValue.increment(quantity),
            updated_at: nowIso
          });
        }
      }
    });
    if (result.alreadyProcessed) return { already_processed: true };
    paymentNotification = {
      title: 'Roses ajoutees',
      message: `${quantity} rose${quantity > 1 ? 's' : ''} ajoutee${quantity > 1 ? 's' : ''} a votre solde.`,
      next_route: '/profile'
    };
  } else if (normalizedType === 'STORY_UPLOAD') {
    const pricing = await getCurrentPricing();
    const purchasePayload = {
      user_id: userId,
      interaction_type: 'STORY_UPLOAD',
      status: 'UNUSED',
      price_amount: pricing.PRICES.STORY_UPLOAD,
      provider: paymentMethod
    };
    const result = await runEntitlementOnce({
      reference,
      ledgerPayload: purchasePayload,
      apply: async (tx, nowIso) => {
        if (!tx) {
          await db.collection('purchased_interactions').add({
            ...purchasePayload,
            reference,
            created_at: nowIso
          });
        }
      }
    });
    if (result.alreadyProcessed) return { already_processed: true };
    paymentNotification = {
      title: 'Story debloquee',
      message: 'Votre publication de story est debloquee.',
      next_route: '/stories'
    };
  } else if (normalizedType === 'LIKES_INBOX_2H') {
    const result = await runEntitlementOnce({
      reference,
      ledgerPayload: {
        user_id: userId,
        interaction_type: 'LIKES_INBOX_2H',
        target_id: targetId || null,
        provider: paymentMethod
      },
      apply: async (tx, nowIso) => {
        const expiresAt = new Date(new Date(nowIso).getTime() + 2 * 3600 * 1000).toISOString();
        const profileRef = db.collection('profiles').doc(userId);
        const payload = { likes_unlocked_until: expiresAt };
        if (tx) tx.update(profileRef, payload);
        else await profileRef.update(payload);
      }
    });
    if (result.alreadyProcessed) return { already_processed: true };
    paymentNotification = {
      title: 'Likes debloques',
      message: 'Votre boite des likes est ouverte pendant 2 heures.',
      next_route: '/likes'
    };
  } else if (normalizedType === 'DISCOVER_GRID_UNLOCK') {
    const pricing = await getCurrentPricing();
    const configuredQuota = Number(pricing.PRICES.GRID_QUOTA || QUOTAS.DISCOVER_GRID_PROFILES);
    const quota = Math.min(
      QUOTAS.DISCOVER_GRID_PROFILES,
      Math.max(1, Number.isFinite(configuredQuota) ? Math.round(configuredQuota) : QUOTAS.DISCOVER_GRID_PROFILES)
    );

    const result = await runEntitlementOnce({
      reference,
      ledgerPayload: {
        user_id: userId,
        interaction_type: 'DISCOVER_GRID_UNLOCK',
        quantity: quota,
        target_id: targetId || null,
        provider: paymentMethod
      },
      apply: async (tx, nowIso) => {
        const profileRef = db.collection('profiles').doc(userId);
        const payload = {
          grid_consultations_remaining: FieldValue.increment(quota),
          grid_quota_purchased_total: FieldValue.increment(quota),
          is_grid_unlocked: true,
          updated_at: nowIso
        };
        if (tx) tx.update(profileRef, payload);
        else await profileRef.update(payload);
      }
    });
    if (result.alreadyProcessed) return { already_processed: true };
    paymentNotification = {
      title: 'Grille decouverte debloquee',
      message: 'Votre quota de decouverte en grille a ete ajoute.',
      next_route: '/discover-grid'
    };
  } else if (normalizedType === 'PARTNER_DISCOVERY_UNLOCK') {
    const pricing = await getCurrentPricing();
    const purchasePayload = {
      user_id: userId,
      interaction_type: 'PARTNER_DISCOVERY_UNLOCK',
      price_amount: pricing.PRICES.PARTNER_DISCOVERY_UNLOCK,
      target_id: targetId || null,
      provider: paymentMethod
    };
    const result = await runEntitlementOnce({
      reference,
      ledgerPayload: purchasePayload,
      apply: async (tx, nowIso) => {
        const profileRef = db.collection('profiles').doc(userId);
        const payload = {
          partner_discovery_unlocked: true,
          partner_discovery_unlocked_at: nowIso,
          updated_at: nowIso
        };
        if (tx) {
          tx.update(profileRef, payload);
        } else {
          await db.collection('purchased_interactions').add({
            ...purchasePayload,
            reference,
            created_at: nowIso
          });
          await profileRef.update(payload);
        }
      }
    });
    if (result.alreadyProcessed) return { already_processed: true };
    paymentNotification = {
      title: 'Partenaires autour de moi debloque',
      message: 'La recherche de partenaires proches est maintenant disponible.',
      next_route: '/partner-discovery'
    };
  } else if (normalizedType === 'DISCOVER_FILTERS_UNLOCK') {
    const pricing = await getCurrentPricing();
    const durationDays = pricing.PRICES.DISCOVER_FILTERS_DAYS || 3;
    const result = await runEntitlementOnce({
      reference,
      ledgerPayload: {
        user_id: userId,
        interaction_type: 'DISCOVER_FILTERS_UNLOCK',
        duration_days: durationDays,
        target_id: targetId || null,
        provider: paymentMethod
      },
      apply: async (tx, nowIso) => {
        const expiresAt = new Date(new Date(nowIso).getTime() + durationDays * 24 * 3600 * 1000).toISOString();
        const profileRef = db.collection('profiles').doc(userId);
        const payload = {
          filters_unlocked_until: expiresAt,
          updated_at: nowIso
        };
        if (tx) tx.update(profileRef, payload);
        else await profileRef.update(payload);
      }
    });
    if (result.alreadyProcessed) return { already_processed: true };
    paymentNotification = {
      title: 'Filtres debloques',
      message: `Votre accès aux filtres est actif pendant ${durationDays} jours.`,
      next_route: '/'
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
