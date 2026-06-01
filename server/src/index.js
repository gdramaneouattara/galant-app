const express = require('express');
const cors = require('cors');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const {
  PORT = 8787,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  EXPO_PUSH_ACCESS_TOKEN = '',
  ALLOWED_ORIGINS = '',
  PAYSTACK_SECRET_KEY = '',
  PAYSTACK_CALLBACK_URL = 'yamo://payment-callback',
  GOOGLE_SERVICE_ACCOUNT_EMAIL = '',
  GOOGLE_PRIVATE_KEY = '',
  ANDROID_PACKAGE_NAME = '',
  APPLE_ISSUER_ID = '',
  APPLE_KEY_ID = '',
  APPLE_PRIVATE_KEY = '',
  IOS_BUNDLE_ID = ''
} = process.env;

const app = express();
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const adminRouter = express.Router();

// --- CONFIGURATION METIERS ---
const TRIAL_DAYS = 7;
const PRICES = {
  SUPER_LIKE: parseInt(process.env.SUPER_LIKE_AMOUNT || '500'),
  DIRECT_MESSAGE: parseInt(process.env.DIRECT_MESSAGE_AMOUNT || '200'),
  BOOST_1D: parseInt(process.env.BOOST_1D_AMOUNT || '1000'),
  BOOST_3D: parseInt(process.env.BOOST_3D_AMOUNT || '2500'),
  BOOST_7D: parseInt(process.env.BOOST_7D_AMOUNT || '5000')
};
const PLAN_AMOUNTS = {
  MONTHLY: parseInt(process.env.PLAN_MONTHLY_AMOUNT || '3000'),
  QUARTERLY: parseInt(process.env.PLAN_QUARTERLY_AMOUNT || '9000'),
  BIANNUAL: parseInt(process.env.PLAN_BIANNUAL_AMOUNT || '15000'),
  ANNUAL: parseInt(process.env.PLAN_ANNUAL_AMOUNT || '30000')
};
const QUOTAS = {
  WOMEN_SUPER_LIKE: 10,
  MEN_3M_INVISIBLE_VIEWS: 20,
  MEN_3M_STATUS_VIEWS: 20,
  DAILY_BOOST_SECONDS: 3600,
  MEN_3M_HIDE_SEEN_SECONDS: 7200,
  TRIAL_BOOST_SECONDS: 3600
};
const DIRECT_MESSAGE_TRIAL_LIMIT = 5;
const PLAN_DURATIONS = { MONTHLY: 30, QUARTERLY: 90, BIANNUAL: 180, ANNUAL: 365 };
const ALLOWED_REPORT_REASONS = new Set([
  'GENERAL',
  'FAKE_PROFILE',
  'HARASSMENT',
  'SPAM',
  'SCAM',
  'INAPPROPRIATE_CONTENT',
  'VIOLENCE',
  'OTHER',
]);
const GOOGLE_ANDROID_PUBLISHER_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const googleAccessTokenCache = { token: null, expiresAt: 0 };
const APPLE_AUDIENCE = 'appstoreconnect-v1';
const APPLE_PROD_TRANSACTION_URL = 'https://api.storekit.itunes.apple.com/inApps/v1/transactions';
const APPLE_SANDBOX_TRANSACTION_URL = 'https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions';
const APPLE_PROD_SUBSCRIPTIONS_URL = 'https://api.storekit.itunes.apple.com/inApps/v1/subscriptions';
const APPLE_SANDBOX_SUBSCRIPTIONS_URL = 'https://api.storekit-sandbox.itunes.apple.com/inApps/v1/subscriptions';
const appleTokenCache = { token: null, expiresAt: 0 };
const SUBSCRIPTION_RENEWAL_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;
const STORY_LIKE_NOTIFICATION_DEDUP_MS = 60 * 1000;

const allowedOrigins = ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({ origin: (origin, cb) => (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) ? cb(null, true) : cb(new Error('CORS_ERROR')) }));
app.use(express.json({ limit: '1mb' }));

// --- MIDDLEWARES ---

const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'missing_token' });
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'invalid_token' });

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (!profile) return res.status(403).json({ error: 'profile_not_found' });

    let sub = await getLatestActiveSubscriptionForUser(user.id);
    if (!sub) {
      sub = await refreshSubscriptionAutoRenewalForUser(user.id);
    }

    // Sync flags
    const isPremium = !!sub;
    const isVip = isPremium && ['BIANNUAL', 'ANNUAL'].includes(sub.plan_id?.toUpperCase());
    if (profile.is_premium !== isPremium || profile.is_vip !== isVip) {
      await supabase.from('profiles').update({ is_premium: isPremium, is_vip: isVip }).eq('id', user.id);
      profile.is_premium = isPremium;
      profile.is_vip = isVip;
    }

    // Keep "Actif" badge reliable without writing on every request.
    try {
      const now = new Date();
      const lastActiveTs = profile.last_active_at ? new Date(profile.last_active_at).getTime() : 0;
      const shouldRefreshLastActive = !lastActiveTs || (now.getTime() - lastActiveTs) >= 5 * 60 * 1000;
      if (shouldRefreshLastActive) {
        await supabase
          .from('profiles')
          .update({ last_active_at: now.toISOString() })
          .eq('id', user.id);
        profile.last_active_at = now.toISOString();
      }
    } catch (_e) {
      // Never block authenticated requests on presence refresh.
    }

    req.user = profile;
    req.subscription = sub;
    req.authUser = user;
    next();
  } catch (e) { res.status(500).json({ error: 'auth_failed' }); }
};

const requireAdmin = (req, res, next) => req.user?.is_admin ? next() : res.status(403).json({ error: 'admin_required' });

// --- HELPERS ---

const isTrialActive = (p) => {
  if (!p || p.gender === 'FEMALE') return false;
  const trialEnd = new Date(p.trial_started_at);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
  return new Date() < trialEnd;
};

const getTrialWindow = (p) => {
  if (!p?.trial_started_at) return null;
  const startedAt = new Date(p.trial_started_at);
  if (Number.isNaN(startedAt.getTime())) return null;
  const endsAt = new Date(startedAt);
  endsAt.setDate(endsAt.getDate() + TRIAL_DAYS);
  return { startedAt, endsAt };
};

const hasStandardAccess = (p) => {
  if (!p) return false;
  if (p.gender === 'FEMALE') return true;
  return isTrialActive(p) || p.is_premium;
};

const hasInvisiblePremiumAccessForPlan = (profile, planId) => {
  const normalized = String(planId || '').toUpperCase();
  if (normalized === 'BIANNUAL' || normalized === 'ANNUAL') return true;
  return (
    (normalized === 'MONTHLY' || normalized === 'QUARTERLY') &&
    !!profile?.is_premium &&
    String(profile?.gender || '').toUpperCase() === 'FEMALE'
  );
};

const hasQuarterlyLimitedInvisibleAccess = (profile, planId) => {
  const normalized = String(planId || '').toUpperCase();
  return (
    normalized === 'QUARTERLY' &&
    !!profile?.is_premium &&
    !!profile?.is_invisible &&
    String(profile?.gender || '').toUpperCase() === 'MALE'
  );
};

const isHiddenByInvisibleMode = (profile, hasInvisiblePremiumAccess = false) => {
  if (!profile || !profile.is_invisible) return false;
  const trialInvisibleCandidate =
    String(profile.gender || '').toUpperCase() === 'MALE' &&
    !profile.is_premium &&
    isTrialActive(profile);
  return trialInvisibleCandidate || hasInvisiblePremiumAccess;
};

const hasDirectMessagePurchase = async (userId, targetUserId) => {
  if (!userId || !targetUserId) return false;
  const { data } = await supabase
    .from('purchased_interactions')
    .select('id')
    .eq('user_id', userId)
    .eq('interaction_type', 'DIRECT_MESSAGE')
    .eq('target_id', targetUserId)
    .maybeSingle();
  return !!data;
};

const getTrialDirectMessageUsage = async (p) => {
  if (!p || p.gender !== 'MALE') return { used: 0, limit: DIRECT_MESSAGE_TRIAL_LIMIT, remaining: 0, active: false };
  const trial = getTrialWindow(p);
  if (!trial) return { used: 0, limit: DIRECT_MESSAGE_TRIAL_LIMIT, remaining: 0, active: false };

  const { data } = await supabase
    .from('purchased_interactions')
    .select('id', { count: 'exact' })
    .eq('user_id', p.id)
    .eq('interaction_type', 'DIRECT_MESSAGE')
    .eq('provider', 'TRIAL')
    .gte('created_at', trial.startedAt.toISOString())
    .lt('created_at', trial.endsAt.toISOString());

  const used = Number(data?.length || 0);
  const remaining = Math.max(0, DIRECT_MESSAGE_TRIAL_LIMIT - used);
  return {
    used,
    limit: DIRECT_MESSAGE_TRIAL_LIMIT,
    remaining,
    active: isTrialActive(p),
  };
};

const getDailyUsage = async (userId, type) => {
  const date = new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('daily_usage').select('*').eq('user_id', userId).eq('action_type', type).eq('action_date', date).maybeSingle();
  return data || { usage_count: 0, usage_seconds: 0 };
};

const incrementUsage = async (userId, type, seconds = 0) => {
  const date = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase.from('daily_usage').select('id, usage_count, usage_seconds').eq('user_id', userId).eq('action_type', type).eq('action_date', date).maybeSingle();
  if (existing) {
    await supabase.from('daily_usage').update({ usage_count: (existing.usage_count || 0) + 1, usage_seconds: (existing.usage_seconds || 0) + seconds }).eq('id', existing.id);
  } else {
    await supabase.from('daily_usage').insert({ user_id: userId, action_type: type, action_date: date, usage_count: 1, usage_seconds: seconds });
  }
};

const isMissingRelationError = (error) => {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();
  return code === '42P01' || message.includes('relation') || message.includes('does not exist');
};

const createStoryLikeNotificationIfNeeded = async ({ recipientId, storyId, likerProfile }) => {
  if (!recipientId || !storyId || !likerProfile?.id) return;
  if (String(recipientId) === String(likerProfile.id)) return;

  const dedupSinceIso = new Date(Date.now() - STORY_LIKE_NOTIFICATION_DEDUP_MS).toISOString();
  const dedupFilter = {
    story_id: String(storyId),
    liker_id: String(likerProfile.id),
  };

  const { data: existingRows, error: existingError } = await supabase
    .from('events')
    .select('id')
    .eq('user_id', recipientId)
    .eq('event_type', 'STORY_NOTIFICATION')
    .eq('event_name', 'STORY_LIKED')
    .gte('created_at', dedupSinceIso)
    .contains('metadata', dedupFilter)
    .limit(1);

  if (existingError) {
    if (isMissingRelationError(existingError)) return;
    return;
  }

  if ((existingRows || []).length > 0) return;

  const likerName = String(likerProfile.name || 'Un utilisateur');
  const likerPhoto = Array.isArray(likerProfile.photos) ? (likerProfile.photos[0] || null) : null;

  const { error: insertError } = await supabase.from('events').insert({
    user_id: recipientId,
    event_type: 'STORY_NOTIFICATION',
    event_name: 'STORY_LIKED',
    metadata: {
      title: 'Story likée',
      message: `${likerName} a aimé votre story.`,
      story_id: String(storyId),
      liker_id: String(likerProfile.id),
      liker_name: likerName,
      liker_photo: likerPhoto,
      is_read: false,
    },
  });

  if (insertError && isMissingRelationError(insertError)) {
    return;
  }
};

const getLatestActiveSubscriptionForUser = async (userId) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('current_period_end', new Date().toISOString())
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data || null;
};

const getLatestRenewableSubscriptionForUser = async (userId) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .in('payment_method', ['GOOGLE_PLAY', 'APPLE_STORE'])
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data || null;
};

const normalizePrivacyStatusForClient = (value) => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'PENDING') return 'OPEN';
  if (normalized === 'PROCESSING') return 'IN_PROGRESS';
  if (normalized === 'COMPLETED') return 'RESOLVED';
  if (normalized === 'FAILED') return 'REJECTED';
  return normalized || 'OPEN';
};

const normalizePrivacyStatusForDb = (value) => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'OPEN') return 'PENDING';
  if (normalized === 'IN_PROGRESS') return 'PROCESSING';
  if (normalized === 'RESOLVED') return 'COMPLETED';
  if (normalized === 'REJECTED') return 'FAILED';
  return null;
};

const normalizeReportStatusForClient = (value) => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'PENDING') return 'OPEN';
  if (normalized === 'INVESTIGATING') return 'IN_REVIEW';
  return normalized || 'OPEN';
};

const normalizeReportStatusForDb = (value) => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'OPEN') return 'PENDING';
  if (normalized === 'IN_REVIEW') return 'INVESTIGATING';
  return normalized || 'PENDING';
};

const buildUserSegmentFilter = (segment) => {
  const value = String(segment || 'ALL').toUpperCase();
  return (profile) => {
    if (value === 'ALL') return true;
    if (value === 'ACTIVE') return !profile.suspended_at;
    if (value === 'UNVERIFIED') return !profile.is_verified;
    if (value === 'VERIFIED') return !!profile.is_verified;
    if (value === 'FREE') return !profile.is_premium;
    if (value === 'PREMIUM') return !!profile.is_premium;
    if (value === 'INVISIBLE_PREMIUM') return !!profile.is_premium && !!profile.is_invisible;
    if (value === 'SUSPENDED') return !!profile.suspended_at;
    return true;
  };
};

const appendAdminAuditLog = async ({
  adminId,
  action,
  targetUserId = null,
  metadata = {},
}) => {
  if (!adminId || !action) return;

  const { error } = await supabase.from('admin_audit_logs').insert({
    admin_id: adminId,
    action,
    target_id: targetUserId,
    target_type: targetUserId ? 'USER' : null,
    new_data: metadata,
  });

  if (error && !isMissingRelationError(error)) {
    console.error('admin_audit_log_insert_failed', error);
  }
};

const getBoostDurationDays = (planId) => {
  if (planId === '7D') return 7;
  if (planId === '3D') return 3;
  return 1;
};

const getExpectedAmountForPurchase = ({ type, planId }) => {
  const normalizedType = String(type || '').toUpperCase();
  const normalizedPlanId = String(planId || '').toUpperCase();

  if (normalizedType === 'PREMIUM') {
    return PLAN_AMOUNTS[normalizedPlanId] ?? null;
  }
  if (normalizedType === 'BOOST') {
    if (normalizedPlanId === '7D') return PRICES.BOOST_7D;
    if (normalizedPlanId === '3D') return PRICES.BOOST_3D;
    if (normalizedPlanId === '1D') return PRICES.BOOST_1D;
    return null;
  }
  if (normalizedType === 'SUPER_LIKE') return PRICES.SUPER_LIKE;
  if (normalizedType === 'DIRECT_MESSAGE') return PRICES.DIRECT_MESSAGE;
  return null;
};

const isPremiumPlanLockedForFemale = (profile, planId) => {
  const normalizedGender = String(profile?.gender || '').toUpperCase();
  const normalizedPlanId = String(planId || '').toUpperCase();
  return normalizedGender === 'FEMALE' && ['QUARTERLY', 'BIANNUAL', 'ANNUAL'].includes(normalizedPlanId);
};

const extractPaystackError = (error) => {
  const payload = error?.response?.data;
  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return payload.message.trim();
  }
  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message.trim();
  }
  return 'paystack_init_failed';
};

const shouldFallbackFromMobileMoney = (error) => {
  const message = extractPaystackError(error).toLowerCase();
  return (
    message.includes('mobile money') ||
    message.includes('channel') ||
    message.includes('not available') ||
    message.includes('unsupported')
  );
};

const toRadians = (value) => (value * Math.PI) / 180;

const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return null;
  }
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const getGooglePrivateKey = () => String(GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const getApplePrivateKey = () => String(APPLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

const getGoogleAccessToken = async () => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (googleAccessTokenCache.token && googleAccessTokenCache.expiresAt > nowSeconds + 60) {
    return googleAccessTokenCache.token;
  }

  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error('google_credentials_not_configured');
  }

  const assertion = jwt.sign(
    {
      iss: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      scope: GOOGLE_ANDROID_PUBLISHER_SCOPE,
      aud: GOOGLE_OAUTH_TOKEN_URL,
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    },
    getGooglePrivateKey(),
    { algorithm: 'RS256' }
  );

  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const response = await axios.post(GOOGLE_OAUTH_TOKEN_URL, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const accessToken = response?.data?.access_token;
  const expiresIn = Number(response?.data?.expires_in || 3600);
  if (!accessToken) throw new Error('google_access_token_missing');

  googleAccessTokenCache.token = accessToken;
  googleAccessTokenCache.expiresAt = nowSeconds + expiresIn;
  return accessToken;
};

const verifyGooglePlayPurchase = async ({ productId, purchaseToken, type, allowInactive = false }) => {
  if (!ANDROID_PACKAGE_NAME) {
    return { valid: false, reason: 'android_package_name_missing' };
  }

  const accessToken = await getGoogleAccessToken();
  const headers = { Authorization: `Bearer ${accessToken}` };
  const encodedPackageName = encodeURIComponent(ANDROID_PACKAGE_NAME);
  const encodedProductId = encodeURIComponent(productId);
  const encodedToken = encodeURIComponent(purchaseToken);

  const isSubscription = String(type || '').toUpperCase() === 'PREMIUM' || String(productId || '').includes('premium');
  const endpoint = isSubscription
    ? `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodedPackageName}/purchases/subscriptions/${encodedProductId}/tokens/${encodedToken}`
    : `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodedPackageName}/purchases/products/${encodedProductId}/tokens/${encodedToken}`;

  const response = await axios.get(endpoint, { headers });
  const payload = response?.data || {};

  if (isSubscription) {
    const expiry = Number(payload.expiryTimeMillis || 0);
    const isExpired = Number.isFinite(expiry) && expiry > 0 && expiry <= Date.now();
    const isCanceled = payload.cancelReason !== undefined && payload.cancelReason !== null;
    const isActive = !isExpired;
    if (!allowInactive && (isExpired || isCanceled)) return { valid: false, reason: 'subscription_not_active' };
    return {
      valid: true,
      payload,
      isActive,
      expiresAt: Number.isFinite(expiry) && expiry > 0 ? new Date(expiry).toISOString() : null,
      autoRenewing: payload.autoRenewing === true,
      canceled: isCanceled,
    };
  }

  if (Number(payload.purchaseState) !== 0) {
    return { valid: false, reason: 'product_not_purchased' };
  }
  return { valid: true, payload };
};

const getAppleAccessToken = async () => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (appleTokenCache.token && appleTokenCache.expiresAt > nowSeconds + 60) {
    return appleTokenCache.token;
  }

  if (!APPLE_ISSUER_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY) {
    throw new Error('apple_credentials_not_configured');
  }

  const token = jwt.sign(
    {
      iss: APPLE_ISSUER_ID,
      iat: nowSeconds,
      exp: nowSeconds + 1800,
      aud: APPLE_AUDIENCE,
    },
    getApplePrivateKey(),
    {
      algorithm: 'ES256',
      keyid: APPLE_KEY_ID,
      header: { typ: 'JWT' },
    }
  );

  appleTokenCache.token = token;
  appleTokenCache.expiresAt = nowSeconds + 1800;
  return token;
};

const decodeJwsPayload = (jws) => {
  const parts = String(jws || '').split('.');
  if (parts.length < 2) return null;
  const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64Payload + '='.repeat((4 - (base64Payload.length % 4)) % 4);
  const json = Buffer.from(padded, 'base64').toString('utf8');
  return JSON.parse(json);
};

const fetchAppleTransactionPayload = async (transactionId) => {
  const token = await getAppleAccessToken();
  const encodedTransactionId = encodeURIComponent(transactionId);
  const endpoints = [APPLE_PROD_TRANSACTION_URL, APPLE_SANDBOX_TRANSACTION_URL];
  let lastError = null;

  for (const baseUrl of endpoints) {
    try {
      const response = await axios.get(`${baseUrl}/${encodedTransactionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const signedTransactionInfo = response?.data?.signedTransactionInfo;
      if (!signedTransactionInfo) {
        return { valid: false, reason: 'apple_signed_transaction_missing' };
      }
      const payload = decodeJwsPayload(signedTransactionInfo);
      if (!payload) {
        return { valid: false, reason: 'apple_transaction_decode_failed' };
      }
      return { valid: true, payload };
    } catch (error) {
      lastError = error;
      const status = Number(error?.response?.status || 0);
      if (status === 404) continue;
      break;
    }
  }

  if (lastError) {
    return { valid: false, reason: 'apple_transaction_lookup_failed', error: String(lastError?.message || lastError) };
  }
  return { valid: false, reason: 'apple_transaction_not_found' };
};

const verifyApplePurchase = async ({ transactionId, productId, type, allowInactive = false }) => {
  if (!transactionId || !productId) {
    return { valid: false, reason: 'apple_purchase_payload_missing' };
  }

  const transaction = await fetchAppleTransactionPayload(transactionId);
  if (!transaction.valid) return transaction;

  const payload = transaction.payload || {};
  if (IOS_BUNDLE_ID && payload.bundleId && payload.bundleId !== IOS_BUNDLE_ID) {
    return { valid: false, reason: 'apple_bundle_mismatch' };
  }
  if (payload.productId !== productId) {
    return { valid: false, reason: 'apple_product_mismatch' };
  }
  if (payload.revocationDate) {
    return { valid: false, reason: 'apple_purchase_revoked' };
  }

  const normalizedType = String(type || '').toUpperCase();
  if (normalizedType === 'PREMIUM') {
    const expiresAtMs = Number(payload.expiresDate || 0);
    const isExpired = Number.isFinite(expiresAtMs) && expiresAtMs > 0 && expiresAtMs <= Date.now();
    if (!allowInactive && isExpired) {
      return { valid: false, reason: 'apple_subscription_expired' };
    }
    return {
      valid: true,
      payload,
      isActive: !isExpired,
      expiresAt: Number.isFinite(expiresAtMs) && expiresAtMs > 0 ? new Date(expiresAtMs).toISOString() : null,
      autoRenewing: null,
      canceled: !!payload.revocationDate,
    };
  }

  return { valid: true, payload };
};

const fetchAppleSubscriptionState = async (originalTransactionId) => {
  if (!originalTransactionId) return { valid: false, reason: 'apple_original_transaction_missing' };
  const token = await getAppleAccessToken();
  const encodedOriginalId = encodeURIComponent(originalTransactionId);
  const endpoints = [APPLE_PROD_SUBSCRIPTIONS_URL, APPLE_SANDBOX_SUBSCRIPTIONS_URL];

  for (const baseUrl of endpoints) {
    try {
      const response = await axios.get(`${baseUrl}/${encodedOriginalId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const groups = response?.data?.data || [];
      let latestExpiryMs = 0;
      let autoRenewing = null;

      for (const group of groups) {
        const lastTransactions = group?.lastTransactions || [];
        for (const transaction of lastTransactions) {
          const txPayload = decodeJwsPayload(transaction?.signedTransactionInfo || '');
          const renewalPayload = decodeJwsPayload(transaction?.signedRenewalInfo || '');
          const expiryMs = Number(txPayload?.expiresDate || 0);
          if (Number.isFinite(expiryMs) && expiryMs > latestExpiryMs) {
            latestExpiryMs = expiryMs;
          }
          if (renewalPayload && typeof renewalPayload.autoRenewStatus !== 'undefined') {
            autoRenewing = Number(renewalPayload.autoRenewStatus) === 1;
          }
        }
      }

      if (latestExpiryMs > 0) {
        return {
          valid: true,
          expiresAt: new Date(latestExpiryMs).toISOString(),
          isActive: latestExpiryMs > Date.now(),
          autoRenewing,
        };
      }
    } catch (_error) {
      // Try next endpoint (prod/sandbox).
    }
  }

  return { valid: false, reason: 'apple_subscription_lookup_failed' };
};

const refreshSubscriptionAutoRenewalForUser = async (userId) => {
  const latest = await getLatestRenewableSubscriptionForUser(userId);
  if (!latest) return null;

  const lastVerifiedTs = latest.last_verified_at ? new Date(latest.last_verified_at).getTime() : 0;
  if (Number.isFinite(lastVerifiedTs) && lastVerifiedTs > 0 && (Date.now() - lastVerifiedTs) < SUBSCRIPTION_RENEWAL_REFRESH_COOLDOWN_MS) {
    return await getLatestActiveSubscriptionForUser(userId);
  }

  let nextStatus = String(latest.status || '').toLowerCase() === 'active' ? 'active' : 'expired';
  let nextEnd = latest.current_period_end || null;
  let nextAutoRenewing = latest.auto_renewing ?? null;

  if (latest.payment_method === 'GOOGLE_PLAY' && latest.external_product_id && latest.external_purchase_token) {
    const google = await verifyGooglePlayPurchase({
      productId: latest.external_product_id,
      purchaseToken: latest.external_purchase_token,
      type: 'PREMIUM',
      allowInactive: true,
    });
    if (google.valid) {
      nextEnd = google.expiresAt || nextEnd;
      nextStatus = google.isActive ? 'active' : 'expired';
      nextAutoRenewing = google.autoRenewing;
    }
  } else if (latest.payment_method === 'APPLE_STORE') {
    let appleState = null;
    if (latest.external_original_transaction_id) {
      appleState = await fetchAppleSubscriptionState(latest.external_original_transaction_id);
    } else if (latest.external_transaction_id && latest.external_product_id) {
      appleState = await verifyApplePurchase({
        transactionId: latest.external_transaction_id,
        productId: latest.external_product_id,
        type: 'PREMIUM',
        allowInactive: true,
      });
    }
    if (appleState?.valid) {
      nextEnd = appleState.expiresAt || nextEnd;
      nextStatus = appleState.isActive ? 'active' : 'expired';
      nextAutoRenewing = typeof appleState.autoRenewing === 'boolean' ? appleState.autoRenewing : nextAutoRenewing;
    }
  }

  const primaryPatch = {
    status: nextStatus,
    current_period_end: nextEnd,
    auto_renewing: nextAutoRenewing,
    last_verified_at: new Date().toISOString(),
  };
  const { error: primaryUpdateError } = await supabase
    .from('subscriptions')
    .update(primaryPatch)
    .eq('id', latest.id);
  if (primaryUpdateError) {
    await supabase
      .from('subscriptions')
      .update({
        status: nextStatus,
        current_period_end: nextEnd,
      })
      .eq('id', latest.id);
  }

  if (nextStatus === 'active' && nextEnd && new Date(nextEnd).getTime() > Date.now()) {
    return await getLatestActiveSubscriptionForUser(userId);
  }
  return null;
};

const applyPurchasedEntitlement = async ({ userId, planId, type, targetId, reference, paymentMethod, purchaseMeta = {} }) => {
  const normalizedType = String(type || '').toUpperCase();
  const normalizedPlanId = String(planId || '').toUpperCase();

  if (normalizedType === 'PREMIUM') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, gender')
      .eq('id', userId)
      .maybeSingle();
    if (isPremiumPlanLockedForFemale(profile, normalizedPlanId)) {
      const err = new Error('female_premium_plan_restricted');
      err.code = 'female_premium_plan_restricted';
      throw err;
    }

    const days = PLAN_DURATIONS[normalizedPlanId] || 30;
    const now = new Date();
    const latestActive = await getLatestActiveSubscriptionForUser(userId);
    const start = latestActive?.current_period_end && new Date(latestActive.current_period_end).getTime() > now.getTime()
      ? new Date(latestActive.current_period_end)
      : now;
    const end = new Date(start);
    end.setDate(end.getDate() + days);

    const payload = {
      user_id: userId,
      plan_id: normalizedPlanId || 'MONTHLY',
      status: 'active',
      current_period_start: start.toISOString(),
      current_period_end: end.toISOString(),
      payment_method: paymentMethod || null,
      external_product_id: purchaseMeta.productId || null,
      external_purchase_token: purchaseMeta.purchaseToken || null,
      external_transaction_id: purchaseMeta.transactionId || null,
      external_original_transaction_id: purchaseMeta.originalTransactionId || null,
      auto_renewing: typeof purchaseMeta.autoRenewing === 'boolean' ? purchaseMeta.autoRenewing : null,
      last_verified_at: new Date().toISOString(),
    };

    const { error: insertWithMetaError } = await supabase.from('subscriptions').insert(payload);
    if (insertWithMetaError) {
      // Backward compatibility when metadata columns are not yet migrated.
      await supabase.from('subscriptions').insert({
        user_id: userId,
        plan_id: normalizedPlanId || 'MONTHLY',
        status: 'active',
        current_period_start: start.toISOString(),
        current_period_end: end.toISOString(),
        payment_method: paymentMethod || null,
      });
    }
    await supabase.from('profiles').update({ is_premium: true }).eq('id', userId);
    return;
  }

  if (normalizedType === 'BOOST') {
    if (reference) {
      const { data: existingBoostPurchase } = await supabase
        .from('purchased_interactions')
        .select('id')
        .eq('reference', reference)
        .maybeSingle();
      if (existingBoostPurchase) return;
    }

    const days = getBoostDurationDays(normalizedPlanId);
    const until = new Date();
    until.setDate(until.getDate() + days);

    await supabase.from('purchased_interactions').insert({
      user_id: userId,
      interaction_type: 'BOOST',
      target_id: null,
      reference,
      price_amount: getExpectedAmountForPurchase({ type: 'BOOST', planId: normalizedPlanId }) || PRICES.BOOST_1D,
    });

    await supabase.from('profiles').update({ boosted_until: until.toISOString() }).eq('id', userId);
    return;
  }

  if (normalizedType === 'SUPER_LIKE') {
    if (!targetId) return;
    await supabase.from('super_likes').insert({
      sender_id: userId,
      recipient_id: targetId,
      status: 'PENDING',
      reference,
    });
    await supabase.from('purchased_interactions').insert({
      user_id: userId,
      interaction_type: 'SUPER_LIKE',
      target_id: targetId,
      reference,
      price_amount: PRICES.SUPER_LIKE,
    });
    return;
  }

  if (normalizedType === 'DIRECT_MESSAGE') {
    if (!targetId) return;
    await supabase.from('purchased_interactions').insert({
      user_id: userId,
      interaction_type: 'DIRECT_MESSAGE',
      target_id: targetId,
      reference,
      price_amount: PRICES.DIRECT_MESSAGE,
    });
  }
};

// --- PAYSTACK ---

app.post('/api/payments/initialize', requireAuth, async (req, res) => {
  const { planId, type, targetId, paymentMethod } = req.body;
  const email = req.authUser.email || `${req.user.id}@yamo.app`;
  const normalizedType = String(type || '').toUpperCase();
  const normalizedPlanId = String(planId || '').toUpperCase();
  const normalizedPaymentMethod = String(paymentMethod || 'CARD').toUpperCase();
  const expectedAmount = getExpectedAmountForPurchase({ type: normalizedType, planId: normalizedPlanId });
  const roundedAmount = Math.round(Number(expectedAmount || 0) * 100);

  if (!PAYSTACK_SECRET_KEY) {
    return res.status(500).json({ error: 'paystack_not_configured' });
  }

  if (!Number.isFinite(roundedAmount) || roundedAmount <= 0 || expectedAmount === null) {
    return res.status(400).json({ error: 'invalid_purchase_payload' });
  }

  if (normalizedType === 'PREMIUM' && isPremiumPlanLockedForFemale(req.user, normalizedPlanId)) {
    return res.status(403).json({ error: 'female_premium_plan_restricted' });
  }

  const payload = {
    email,
    amount: roundedAmount,
    currency: 'XOF',
    callback_url: PAYSTACK_CALLBACK_URL,
    metadata: {
      userId: req.user.id,
      planId: normalizedPlanId || null,
      type: normalizedType,
      targetId: targetId || null,
      paymentMethod: normalizedPaymentMethod,
    },
  };

  // Mobile money purchases are explicitly routed to Paystack.
  if (normalizedPaymentMethod === 'MOBILE_MONEY') {
    payload.channels = ['mobile_money'];
  }

  try {
    const response = await axios.post('https://api.paystack.co/transaction/initialize', payload, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    return res.json(response.data.data);
  } catch (error) {
    if (normalizedPaymentMethod === 'MOBILE_MONEY' && shouldFallbackFromMobileMoney(error)) {
      try {
        const fallbackPayload = { ...payload };
        delete fallbackPayload.channels;
        const fallbackResponse = await axios.post('https://api.paystack.co/transaction/initialize', fallbackPayload, {
          headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
        });
        return res.json(fallbackResponse.data.data);
      } catch (fallbackError) {
        return res.status(500).json({
          error: extractPaystackError(fallbackError),
          code: 'paystack_init_failed',
        });
      }
    }

    return res.status(500).json({
      error: extractPaystackError(error),
      code: 'paystack_init_failed',
    });
  }
});

app.get('/api/payments/verify', requireAuth, async (req, res) => {
  const { reference } = req.query;
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ error: 'paystack_not_configured' });
    }

    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } });
    const data = response.data.data;
    if (data.status === 'success') {
      const { userId, planId, type, targetId } = data.metadata || {};
      if (!userId || userId !== req.user.id) {
        return res.status(403).json({ error: 'payment_user_mismatch' });
      }

      const expectedAmount = getExpectedAmountForPurchase({ type, planId });
      const expectedMinorUnits = Math.round(Number(expectedAmount || 0) * 100);
      const paidMinorUnits = Number(data.amount || 0);
      if (expectedAmount === null || !Number.isFinite(paidMinorUnits) || paidMinorUnits !== expectedMinorUnits) {
        return res.status(400).json({ error: 'payment_amount_mismatch' });
      }

      try {
        await applyPurchasedEntitlement({
          userId,
          planId,
          type,
          targetId,
          reference,
          paymentMethod: 'PAYSTACK',
        });
      } catch (entitlementError) {
        if (entitlementError?.code === 'female_premium_plan_restricted') {
          return res.status(403).json({ error: 'female_premium_plan_restricted' });
        }
        throw entitlementError;
      }
      return res.json({ status: 'active', reference });
    }
    res.json({ status: data.status });
  } catch (e) { res.status(500).json({ error: 'paystack_verify_failed' }); }
});

app.post('/api/payments/google-verify', requireAuth, async (req, res) => {
  const { purchaseToken, productId, planId, type, targetId } = req.body;
  const userId = req.user.id;
  const normalizedType = String(type || '').toUpperCase();
  const normalizedPlanId = String(planId || '').toUpperCase();
  const safeReference = String(purchaseToken || '');

  try {
    if (!purchaseToken || !productId) {
      return res.status(400).json({ error: 'missing_google_purchase_payload' });
    }

    const verification = await verifyGooglePlayPurchase({ productId, purchaseToken, type: normalizedType });
    if (!verification.valid) {
      return res.status(400).json({ error: 'invalid_google_purchase', reason: verification.reason || 'verification_failed' });
    }

    try {
      await applyPurchasedEntitlement({
        userId,
        planId: normalizedPlanId,
        type: normalizedType || (String(productId).includes('premium') ? 'PREMIUM' : ''),
        targetId,
        reference: safeReference,
        paymentMethod: 'GOOGLE_PLAY',
        purchaseMeta: {
          productId,
          purchaseToken,
          autoRenewing: verification.autoRenewing,
        },
      });
    } catch (entitlementError) {
      if (entitlementError?.code === 'female_premium_plan_restricted') {
        return res.status(403).json({ error: 'female_premium_plan_restricted' });
      }
      throw entitlementError;
    }

    res.json({ status: 'success' });
  } catch (e) {
    res.status(500).json({ error: 'google_verify_failed', detail: String(e?.message || e) });
  }
});

app.post('/api/payments/apple-verify', requireAuth, async (req, res) => {
  const { transactionId, productId, planId, type, targetId } = req.body;
  const userId = req.user.id;
  const normalizedType = String(type || '').toUpperCase();
  const normalizedPlanId = String(planId || '').toUpperCase();
  const safeReference = String(transactionId || '');

  try {
    const verification = await verifyApplePurchase({ transactionId, productId, type: normalizedType });
    if (!verification.valid) {
      return res.status(400).json({ error: 'invalid_apple_purchase', reason: verification.reason || 'verification_failed' });
    }

    try {
      await applyPurchasedEntitlement({
        userId,
        planId: normalizedPlanId,
        type: normalizedType,
        targetId,
        reference: safeReference,
        paymentMethod: 'APPLE_STORE',
        purchaseMeta: {
          productId,
          transactionId,
          originalTransactionId: verification?.payload?.originalTransactionId || verification?.payload?.transactionId || transactionId,
          autoRenewing: typeof verification?.autoRenewing === 'boolean' ? verification.autoRenewing : null,
        },
      });
    } catch (entitlementError) {
      if (entitlementError?.code === 'female_premium_plan_restricted') {
        return res.status(403).json({ error: 'female_premium_plan_restricted' });
      }
      throw entitlementError;
    }

    res.json({ status: 'success' });
  } catch (e) {
    res.status(500).json({ error: 'apple_verify_failed', detail: String(e?.message || e) });
  }
});

// --- MATCHMAKING ---

app.get('/api/matchmaking/suggestions', requireAuth, async (req, res) => {
  const me = req.user;
  const { limit = 40, minAge = 18, maxAge = 100, gender, city = '', maxDistanceKm } = req.query;
  const meGender = String(me?.gender || '').toUpperCase();
  const meGoal = String(me?.relationship_goal || '').toUpperCase();
  const oppositeGenderForSerious =
    meGoal === 'SERIOUS'
      ? (meGender === 'MALE' ? 'FEMALE' : meGender === 'FEMALE' ? 'MALE' : null)
      : null;
  const cityFilter = String(city || '').trim().toLowerCase();
  const maxDistance = Number.isFinite(parseFloat(maxDistanceKm))
    ? Math.max(1, parseFloat(maxDistanceKm))
    : null;

  let query = supabase.from('profiles')
    .select('*')
    .neq('id', me.id)
    .is('suspended_at', null)
    .eq('onboarding_completed', true)
    .gte('age', parseInt(minAge))
    .lte('age', parseInt(maxAge));

  if (oppositeGenderForSerious) {
    query = query.eq('gender', oppositeGenderForSerious);
  } else if (gender && gender !== 'ALL') {
    query = query.eq('gender', gender);
  }

  const { data: candidates, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const candidateById = new Map((candidates || []).map((candidate) => [candidate.id, candidate]));
  const candidateIds = (candidates || []).map((candidate) => candidate.id).filter(Boolean);
  const invisibleEligibleBySubscription = new Set();
  if (candidateIds.length > 0) {
    const { data: eligibleInvisibleSubs } = await supabase
      .from('subscriptions')
      .select('user_id, plan_id')
      .in('user_id', candidateIds)
      .eq('status', 'active')
      .gt('current_period_end', new Date().toISOString());

    for (const row of (eligibleInvisibleSubs || [])) {
      if (row?.user_id && hasInvisiblePremiumAccessForPlan(candidateById.get(row.user_id), row?.plan_id)) {
        invisibleEligibleBySubscription.add(row.user_id);
      }
    }
  }

  const incomingSuperLikesByCandidate = new Set();
  if (candidateIds.length > 0) {
    const { data: incomingSuperLikes } = await supabase
      .from('likes')
      .select('liker_id')
      .eq('liked_id', me.id)
      .eq('is_super_like', true)
      .in('liker_id', candidateIds);

    for (const row of (incomingSuperLikes || [])) {
      const likerId = row?.liker_id;
      if (!likerId) continue;
      const likerProfile = candidateById.get(likerId);
      const hiddenByInvisible = isHiddenByInvisibleMode(
        likerProfile,
        invisibleEligibleBySubscription.has(likerId)
      );
      if (!hiddenByInvisible) {
        incomingSuperLikesByCandidate.add(likerId);
      }
    }
  }

  const suggestions = (candidates || []).map(c => {
    const hiddenByInvisibleMode = isHiddenByInvisibleMode(
      c,
      invisibleEligibleBySubscription.has(c.id)
    );
    if (hiddenByInvisibleMode) {
      return null;
    }

    const distanceKm = getDistanceKm(
      Number(me.latitude),
      Number(me.longitude),
      Number(c.latitude),
      Number(c.longitude)
    );

    if (cityFilter) {
      const candidateCity = String(c.city || '').trim().toLowerCase();
      if (candidateCity !== cityFilter) {
        return null;
      }
    }

    if (maxDistance !== null) {
      if (distanceKm === null || distanceKm > maxDistance) {
        return null;
      }
    }

    // Scoring logic
    let score = (c.is_vip ? 200 : (c.is_premium ? 50 : 0)) + (c.city === me.city ? 15 : 0);

    // Add boosted priority
    if (c.boosted_until && new Date(c.boosted_until) > new Date()) {
      score += 500;
    }

    return {
      ...c,
      score,
      distance_km: distanceKm,
      super_liked_me: incomingSuperLikesByCandidate.has(c.id),
    };
  }).filter(Boolean).sort((a, b) => b.score - a.score);

  res.json({ suggestions: suggestions.slice(0, parseInt(limit)) });
});

app.post('/api/matchmaking/swipe', requireAuth, async (req, res) => {
  const { targetUserId, direction, isSuperLike } = req.body;
  const me = req.user;
  const safeTargetUserId = String(targetUserId || '').trim();

  if (!safeTargetUserId || safeTargetUserId === String(me.id)) {
    return res.status(400).json({ error: 'invalid_target' });
  }

  const { data: targetProfile, error: targetProfileError } = await supabase
    .from('profiles')
    .select('id, gender, is_premium, is_invisible, trial_started_at, suspended_at')
    .eq('id', safeTargetUserId)
    .maybeSingle();
  if (targetProfileError) return res.status(500).json({ error: targetProfileError.message });
  if (!targetProfile || targetProfile.suspended_at) {
    return res.status(404).json({ error: 'target_not_found' });
  }

  const meHasInvisiblePremiumAccess = hasInvisiblePremiumAccessForPlan(me, req.subscription?.plan_id);
  const meHasQuarterlyLimitedInvisible = hasQuarterlyLimitedInvisibleAccess(me, req.subscription?.plan_id);
  let meQuarterlyInvisibleStealthAvailable = false;
  if (meHasQuarterlyLimitedInvisible) {
    const usage = await getDailyUsage(me.id, 'INVISIBLE_VIEW');
    meQuarterlyInvisibleStealthAvailable = usage.usage_count < QUOTAS.MEN_3M_INVISIBLE_VIEWS;
    await incrementUsage(me.id, 'INVISIBLE_VIEW');
  }
  const meHiddenByInvisibleMode =
    isHiddenByInvisibleMode(me, meHasInvisiblePremiumAccess) ||
    meQuarterlyInvisibleStealthAvailable;

  if (direction === 'LEFT') {
    return res.json({ matched: false, matchId: null });
  }

  // Product decision: all authenticated users can like and match.
  const canLike = true;
  if (!canLike) {
    return res.status(403).json({ error: 'subscription_required' });
  }

  if (isSuperLike) {
    let free = false;
    // Only Premium Women get 10 free super likes per day
    if (me.gender === 'FEMALE' && me.is_premium) {
      const u = await getDailyUsage(me.id, 'SUPER_LIKE');
      if (u.usage_count < QUOTAS.WOMEN_SUPER_LIKE) free = true;
    }

    if (!free) {
      const { data: p } = await supabase.from('purchased_interactions').select('id').eq('user_id', me.id).eq('interaction_type', 'SUPER_LIKE').eq('target_id', safeTargetUserId).maybeSingle();
      if (!p) return res.status(403).json({ error: 'premium_required_for_super_like' });
    }
    await incrementUsage(me.id, 'SUPER_LIKE');
  }

  await supabase.from('likes').upsert({ liker_id: me.id, liked_id: safeTargetUserId, is_super_like: !!isSuperLike });

  // Complete anonymous mode: liking while invisible never triggers an immediate match.
  if (meHiddenByInvisibleMode) {
    return res.json({ matched: false, matchId: null, invisible_like: true });
  }

  const { data: reciprocalLike } = await supabase
    .from('likes')
    .select('*')
    .eq('liker_id', safeTargetUserId)
    .eq('liked_id', me.id)
    .maybeSingle();

  if (!reciprocalLike) {
    return res.json({ matched: false, matchId: null });
  }

  // If reciprocal liker is hidden by invisible mode, keep the like discreet (no auto-match).
  let targetHasInvisiblePremiumAccess = false;
  let targetHasQuarterlyLimitedInvisibleStealth = false;
  if (targetProfile?.is_premium) {
    const { data: targetSub } = await supabase
      .from('subscriptions')
      .select('plan_id')
      .eq('user_id', safeTargetUserId)
      .eq('status', 'active')
      .gt('current_period_end', new Date().toISOString())
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();
    targetHasInvisiblePremiumAccess = hasInvisiblePremiumAccessForPlan(targetProfile, targetSub?.plan_id);
    if (hasQuarterlyLimitedInvisibleAccess(targetProfile, targetSub?.plan_id)) {
      const targetUsage = await getDailyUsage(safeTargetUserId, 'INVISIBLE_VIEW');
      targetHasQuarterlyLimitedInvisibleStealth = targetUsage.usage_count < QUOTAS.MEN_3M_INVISIBLE_VIEWS;
    }
  }
  const targetHiddenByInvisibleMode = isHiddenByInvisibleMode(targetProfile, targetHasInvisiblePremiumAccess);
  if (targetHiddenByInvisibleMode || targetHasQuarterlyLimitedInvisibleStealth) {
    return res.json({ matched: false, matchId: null, invisible_like: true });
  }

  const [userOneId, userTwoId] = [me.id, safeTargetUserId].sort();
  const { data: existingMatch } = await supabase
    .from('matches')
    .select('id')
    .eq('user_one_id', userOneId)
    .eq('user_two_id', userTwoId)
    .maybeSingle();

  if (existingMatch?.id) {
    return res.json({ matched: true, matchId: existingMatch.id });
  }

  const { data: createdMatch, error: createMatchError } = await supabase
    .from('matches')
    .insert({ user_one_id: userOneId, user_two_id: userTwoId, status: 'ACTIVE' })
    .select('id')
    .single();

  if (createMatchError) {
    if (String(createMatchError.code || '') === '23505') {
      const { data: raceMatch } = await supabase
        .from('matches')
        .select('id')
        .eq('user_one_id', userOneId)
        .eq('user_two_id', userTwoId)
        .maybeSingle();
      if (raceMatch?.id) {
        return res.json({ matched: true, matchId: raceMatch.id });
      }
    }
    return res.status(500).json({ error: 'match_creation_failed' });
  }

  if (!createdMatch?.id) {
    return res.status(500).json({ error: 'match_creation_failed' });
  }

  return res.json({ matched: true, matchId: createdMatch.id });
});

app.get('/api/likes/quota', requireAuth, async (_req, res) => {
  res.json({
    limit: null,
    used: 0,
    remaining: null,
    resetAt: null,
  });
});

app.post('/api/subscriptions/sync', requireAuth, async (req, res) => {
  try {
    const activeSub = await getLatestActiveSubscriptionForUser(req.user.id) || await refreshSubscriptionAutoRenewalForUser(req.user.id);
    const isPremium = !!activeSub;
    const isVip = isPremium && ['BIANNUAL', 'ANNUAL'].includes(String(activeSub?.plan_id || '').toUpperCase());

    if (req.user.is_premium !== isPremium || req.user.is_vip !== isVip) {
      await supabase
        .from('profiles')
        .update({ is_premium: isPremium, is_vip: isVip })
        .eq('id', req.user.id);
    }

    res.json({
      active: isPremium,
      plan_id: activeSub?.plan_id || null,
      current_period_end: activeSub?.current_period_end || null,
      auto_renewing: typeof activeSub?.auto_renewing === 'boolean' ? activeSub.auto_renewing : null,
    });
  } catch (e) {
    res.status(500).json({ error: 'subscription_sync_failed' });
  }
});

app.get('/api/messages/direct-thread-quota', requireAuth, async (req, res) => {
  const me = req.user;
  if (!me || me.gender !== 'MALE' || me.is_premium) {
    return res.json({
      active: false,
      limit: DIRECT_MESSAGE_TRIAL_LIMIT,
      used: 0,
      remaining: DIRECT_MESSAGE_TRIAL_LIMIT,
    });
  }

  const usage = await getTrialDirectMessageUsage(me);
  return res.json(usage);
});

// --- MESSAGES & STATUTS ---

app.post('/api/messages/direct-thread', requireAuth, async (req, res) => {
  const me = req.user;
  const { targetUserId } = req.body;

  if (!targetUserId || String(targetUserId) === String(me.id)) {
    return res.status(400).json({ error: 'invalid_target' });
  }

  const { data: targetUser } = await supabase
    .from('profiles')
    .select('id, suspended_at')
    .eq('id', targetUserId)
    .maybeSingle();
  if (!targetUser || targetUser.suspended_at) {
    return res.status(404).json({ error: 'target_not_found' });
  }

  const [userOneId, userTwoId] = [me.id, targetUserId].sort();
  const { data: existingMatch } = await supabase
    .from('matches')
    .select('id, status')
    .eq('user_one_id', userOneId)
    .eq('user_two_id', userTwoId)
    .maybeSingle();

  if (existingMatch?.id) {
    if (existingMatch.status === 'BLOCKED') {
      return res.status(403).json({ error: 'conversation_blocked' });
    }
    if (existingMatch.status === 'UNMATCHED') {
      return res.status(403).json({ error: 'conversation_unmatched' });
    }
    return res.json({ matchId: existingMatch.id, unlocked: true });
  }

  // Direct thread creation is pay-per-action for:
  // - premium users (all premium plans)
  // - users without standard access
  // - women on free tier (no more free direct-thread outside a match)
  const isFreeTierFemale =
    String(me.gender || '').toUpperCase() === 'FEMALE' &&
    !me.is_premium;
  if (me.is_premium || !hasStandardAccess(me) || isFreeTierFemale) {
    const purchased = await hasDirectMessagePurchase(me.id, targetUserId);
    if (!purchased) {
      return res.status(403).json({ error: 'payment_required' });
    }
  }

  const maleTrial = me.gender === 'MALE' && !me.is_premium && isTrialActive(me);
  if (maleTrial) {
    const usage = await getTrialDirectMessageUsage(me);
    if (usage.remaining <= 0) {
      const purchased = await hasDirectMessagePurchase(me.id, targetUserId);
      if (purchased) {
        // Paid direct message can bypass the free trial quota.
      } else {
      return res.status(403).json({
        error: 'direct_message_trial_quota_exceeded',
        used: usage.used,
        limit: usage.limit,
        remaining: usage.remaining,
      });
      }
    }
  }

  const { data: createdMatch, error: createMatchError } = await supabase
    .from('matches')
    .insert({ user_one_id: userOneId, user_two_id: userTwoId, status: 'ACTIVE' })
    .select('id')
    .single();

  if (createMatchError) {
    if (String(createMatchError.code || '') === '23505') {
      const { data: raceMatch } = await supabase
        .from('matches')
        .select('id')
        .eq('user_one_id', userOneId)
        .eq('user_two_id', userTwoId)
        .maybeSingle();
      if (raceMatch?.id) {
        return res.json({ matchId: raceMatch.id, unlocked: true });
      }
    }
    return res.status(500).json({ error: 'direct_thread_creation_failed' });
  }

  if (!createdMatch?.id) {
    return res.status(500).json({ error: 'direct_thread_creation_failed' });
  }

  if (maleTrial) {
    await supabase.from('purchased_interactions').insert({
      user_id: me.id,
      interaction_type: 'DIRECT_MESSAGE',
      target_id: targetUserId,
      reference: null,
      price_amount: 0,
      currency: 'XOF',
      provider: 'TRIAL',
    });
  }

  return res.json({ matchId: createdMatch.id, unlocked: true });
});

app.post('/api/messages/report', requireAuth, async (req, res) => {
  const me = req.user;
  const reportedUserId = String(req.body?.reportedUserId || '').trim();
  const reason = String(req.body?.reason || '').trim().toUpperCase() || 'GENERAL';
  const detailsRaw = String(req.body?.details || '').trim();
  const details = detailsRaw ? detailsRaw.slice(0, 1000) : null;

  if (!reportedUserId || reportedUserId === String(me.id)) {
    return res.status(400).json({ error: 'invalid_target' });
  }
  if (!ALLOWED_REPORT_REASONS.has(reason)) {
    return res.status(400).json({ error: 'invalid_reason' });
  }

  const { data: targetUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', reportedUserId)
    .maybeSingle();
  if (!targetUser) return res.status(404).json({ error: 'target_not_found' });

  const { data: existingOpen } = await supabase
    .from('reports')
    .select('id, status')
    .eq('reporter_id', me.id)
    .eq('reported_user_id', reportedUserId)
    .eq('reason', reason)
    .in('status', ['PENDING', 'INVESTIGATING'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingOpen?.id) {
    return res.json({ success: true, duplicated: true, reportId: existingOpen.id });
  }

  const { error } = await supabase.from('reports').insert({
    reporter_id: me.id,
    reported_user_id: reportedUserId,
    reason,
    details,
    status: 'PENDING',
  });
  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});

app.post('/api/messages/block', requireAuth, async (req, res) => {
  const me = req.user;
  const blockedUserId = String(req.body?.blockedUserId || '').trim();
  if (!blockedUserId || blockedUserId === String(me.id)) {
    return res.status(400).json({ error: 'invalid_target' });
  }

  const { data: targetUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', blockedUserId)
    .maybeSingle();
  if (!targetUser) return res.status(404).json({ error: 'target_not_found' });

  const [userOneId, userTwoId] = [me.id, blockedUserId].sort();
  const { data: existingMatch } = await supabase
    .from('matches')
    .select('id')
    .eq('user_one_id', userOneId)
    .eq('user_two_id', userTwoId)
    .maybeSingle();

  if (existingMatch?.id) {
    const { error: updateError } = await supabase
      .from('matches')
      .update({ status: 'BLOCKED' })
      .eq('id', existingMatch.id);
    if (updateError) return res.status(500).json({ error: updateError.message });
    return res.json({ success: true, blocked: true, matchId: existingMatch.id });
  }

  const { data: createdMatch, error: createError } = await supabase
    .from('matches')
    .insert({ user_one_id: userOneId, user_two_id: userTwoId, status: 'BLOCKED' })
    .select('id')
    .single();
  if (createError) return res.status(500).json({ error: createError.message });

  res.json({ success: true, blocked: true, matchId: createdMatch?.id || null });
});

app.post('/api/messages/unblock', requireAuth, async (req, res) => {
  const me = req.user;
  const blockedUserId = String(req.body?.blockedUserId || '').trim();
  if (!blockedUserId || blockedUserId === String(me.id)) {
    return res.status(400).json({ error: 'invalid_target' });
  }

  const { data: targetUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', blockedUserId)
    .maybeSingle();
  if (!targetUser) return res.status(404).json({ error: 'target_not_found' });

  const [userOneId, userTwoId] = [me.id, blockedUserId].sort();
  const { data: existingMatch } = await supabase
    .from('matches')
    .select('id, status')
    .eq('user_one_id', userOneId)
    .eq('user_two_id', userTwoId)
    .maybeSingle();

  if (!existingMatch?.id) {
    return res.status(404).json({ error: 'conversation_not_found' });
  }

  if (existingMatch.status !== 'BLOCKED') {
    return res.json({ success: true, status: existingMatch.status, matchId: existingMatch.id });
  }

  const { error: updateError } = await supabase
    .from('matches')
    .update({ status: 'ACTIVE' })
    .eq('id', existingMatch.id);
  if (updateError) return res.status(500).json({ error: updateError.message });

  res.json({ success: true, status: 'ACTIVE', matchId: existingMatch.id });
});

app.post('/api/messages/send', requireAuth, async (req, res) => {
  const { matchId, content, recipientId, messageType, mediaPath } = req.body;
  const me = req.user;

  const { data: match } = await supabase
    .from('matches')
    .select('id, status, user_one_id, user_two_id')
    .eq('id', matchId)
    .maybeSingle();
  if (match?.status === 'BLOCKED') return res.status(403).json({ error: 'conversation_blocked' });
  if (match?.status === 'UNMATCHED') return res.status(403).json({ error: 'conversation_unmatched' });
  if (!match) return res.status(403).json({ error: 'subscription_required' });

  if (!hasStandardAccess(me)) {
    const otherUserId = String(match.user_one_id) === String(me.id) ? match.user_two_id : match.user_one_id;
    const explicitRecipientId = recipientId ? String(recipientId) : null;
    const targetUserId = explicitRecipientId || String(otherUserId || '');

    if (!targetUserId || targetUserId === String(me.id)) {
      return res.status(403).json({ error: 'subscription_required' });
    }

    const purchased = await hasDirectMessagePurchase(me.id, targetUserId);
    if (!purchased) {
      return res.status(403).json({ error: 'subscription_required' });
    }
  }

  const normalizedType = String(messageType || 'TEXT').toUpperCase();
  if (!['TEXT', 'IMAGE', 'VIDEO'].includes(normalizedType)) {
    return res.status(400).json({ error: 'unsupported_message_type' });
  }

  const normalizedContent = typeof content === 'string' ? content.trim() : '';
  if (normalizedType === 'TEXT' && !normalizedContent) {
    return res.status(400).json({ error: 'empty_message' });
  }
  if ((normalizedType === 'IMAGE' || normalizedType === 'VIDEO') && !mediaPath) {
    return res.status(400).json({ error: 'missing_media_path' });
  }

  const { data, error } = await supabase.from('messages').insert({
    match_id: matchId || null,
    sender_id: me.id,
    content: normalizedContent || null,
    message_type: normalizedType,
    media_url: mediaPath || null
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/messages/mark-read', requireAuth, async (req, res) => {
  const { matchId } = req.body;
  const me = req.user;
  const meHasInvisiblePremiumAccess = hasInvisiblePremiumAccessForPlan(me, req.subscription?.plan_id);
  const meHiddenByInvisibleMode = isHiddenByInvisibleMode(me, meHasInvisiblePremiumAccess);

  if (meHiddenByInvisibleMode) {
    // Complete anonymous mode: no read receipt update when invisible mode is active.
    return res.json({ stealth: true });
  }

  if (
    req.subscription?.plan_id === 'QUARTERLY' &&
    String(me.gender || '').toUpperCase() === 'MALE' &&
    !!me.is_invisible
  ) {
    const u = await getDailyUsage(me.id, 'HIDE_SEEN');
    if (u.usage_seconds < QUOTAS.MEN_3M_HIDE_SEEN_SECONDS) {
      // Logic for hiding seen is usually handled by NOT updating is_read
      // or by client-side flag. Here we just return that they are in "stealth"
      await incrementUsage(me.id, 'HIDE_SEEN', 60); // Increment by 1 minute for this action
      return res.json({ stealth: true });
    }
  }

  const { error } = await supabase.from('messages')
    .update({ is_read: true })
    .eq('match_id', matchId)
    .neq('sender_id', me.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post('/api/boosts/initialize', requireAuth, async (req, res) => {
  const { planId } = req.body; // '1D', '3D', '7D'
  const email = req.authUser.email || `${req.user.id}@yamo.app`;

  let amount = PRICES.BOOST_1D;
  if (planId === '3D') amount = PRICES.BOOST_3D;
  if (planId === '7D') amount = PRICES.BOOST_7D;

  try {
    const response = await axios.post('https://api.paystack.co/transaction/initialize', {
      email,
      amount: amount * 100,
      currency: 'XOF',
      callback_url: PAYSTACK_CALLBACK_URL,
      metadata: { userId: req.user.id, type: 'BOOST', planId }
    }, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } });
    res.json(response.data.data);
  } catch (error) {
    res.status(500).json({
      error: extractPaystackError(error),
      code: 'paystack_init_failed',
    });
  }
});

app.get('/api/boosts/verify', requireAuth, async (req, res) => {
  const { reference } = req.query;
  try {
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } });
    const data = response.data.data;
    if (data.status === 'success') {
      const { userId, planId } = data.metadata;

      let durationSeconds = 86400; // 1 day
      if (planId === '3D') durationSeconds = 86400 * 3;
      if (planId === '7D') durationSeconds = 86400 * 7;

      const boostedUntil = new Date(Date.now() + durationSeconds * 1000).toISOString();
      await supabase.from('profiles').update({ boosted_until: boostedUntil }).eq('id', userId);
      // We don't incrementUsage for paid boosts as they are not quota-based
      return res.json({ status: 'active', boosted_until: boostedUntil });
    }
    res.json({ status: data.status });
  } catch (e) { res.status(500).json({ error: 'paystack_verify_failed' }); }
});

app.post('/api/profile/boost', requireAuth, async (req, res) => {
  const me = req.user;
  const duration = 3600; // 1 hour for free/subscription sessions

  let canBoost = false;

  // 1. Check Women Premium quota (1h/day)
  if (me.gender === 'FEMALE' && me.is_premium) {
    const u = await getDailyUsage(me.id, 'BOOST');
    if (u.usage_seconds < QUOTAS.DAILY_BOOST_SECONDS) canBoost = true;
  }

  // 2. Check Trial User quota (1h total during trial)
  if (!canBoost && isTrialActive(me)) {
    // For trial, we check cumulative usage over the 7 days
    const { data } = await supabase.from('daily_usage').select('usage_seconds').eq('user_id', me.id).eq('action_type', 'BOOST');
    const totalTrialUsage = (data || []).reduce((acc, curr) => acc + (curr.usage_seconds || 0), 0);
    if (totalTrialUsage < QUOTAS.TRIAL_BOOST_SECONDS) canBoost = true;
  }

  if (!canBoost) {
    return res.status(403).json({ error: 'no_free_boost_available', message: 'Votre heure de boost gratuite est épuisée.' });
  }

  const boostedUntil = new Date(Date.now() + duration * 1000).toISOString();
  const { error } = await supabase.from('profiles').update({ boosted_until: boostedUntil }).eq('id', me.id);

  if (error) return res.status(500).json({ error: error.message });
  await incrementUsage(me.id, 'BOOST', duration);
  res.json({ boosted_until: boostedUntil });
});

app.get('/api/kyc/me', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { data, error } = await supabase
    .from('kyc_verifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingRelationError(error)) {
      return res.json({ is_verified: !!req.user.is_verified, current: null, history: [] });
    }
    return res.status(500).json({ error: error.message });
  }

  const mapped = (data || []).map((row) => ({
    id: row.id,
    status: row.status,
    document_type: row.document_type,
    submitted_at: row.submitted_at || row.created_at,
    reviewed_at: row.reviewed_at || null,
    rejection_reason: row.rejection_reason || null,
  }));

  res.json({
    is_verified: !!req.user.is_verified,
    current: mapped[0] || null,
    history: mapped,
  });
});

app.post('/api/kyc/requests', requireAuth, async (req, res) => {
  const documentType = req.body.documentType || req.body.document_type;
  const documentFront = req.body.documentFront || req.body.document_front_url || req.body.document_front_path;
  const documentBack = req.body.documentBack || req.body.document_back_url || req.body.document_back_path || null;
  const selfie = req.body.selfie || req.body.selfie_url || req.body.selfie_path;

  let insertPayload = {
    user_id: req.user.id,
    document_type: documentType,
    document_front_url: documentFront,
    document_back_url: documentBack,
    selfie_url: selfie,
    status: 'PENDING',
  };

  let { data, error } = await supabase.from('kyc_verifications').insert(insertPayload).select().single();
  if (error && String(error.code || '') === '42703') {
    insertPayload = {
      user_id: req.user.id,
      document_type: documentType,
      document_url: documentFront,
      document_back_url: documentBack,
      selfie_url: selfie,
      status: 'PENDING',
    };
    ({ data, error } = await supabase.from('kyc_verifications').insert(insertPayload).select().single());
  }

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/moderation/photos/check', requireAuth, async (req, res) => {
  const photoUrls = Array.isArray(req.body?.photoUrls) ? req.body.photoUrls : [];
  const violations = [];

  for (const url of photoUrls) {
    const flags = [];
    const value = String(url || '').trim();
    if (!/^https?:\/\//i.test(value)) flags.push('invalid_url');
    if (!/\.(jpg|jpeg|png|webp)(\?|$)/i.test(value)) flags.push('invalid_extension');
    if (flags.length > 0) violations.push({ url: value, flags });
  }

  if (violations.length > 0) {
    return res.json({ status: 'REJECTED', violations });
  }

  return res.json({ status: 'APPROVED', violations: [] });
});

app.get('/api/statuses', requireAuth, async (req, res) => {
  const me = req.user;
  if (!hasStandardAccess(me)) {
    return res.status(403).json({ error: 'subscription_required' });
  }
  if (
    String(me.gender || '').toUpperCase() === 'MALE' &&
    req.subscription?.plan_id === 'QUARTERLY' &&
    !!me.is_invisible
  ) {
    const u = await getDailyUsage(me.id, 'STATUS_VIEW');
    if (u.usage_count >= QUOTAS.MEN_3M_STATUS_VIEWS) return res.status(403).json({ error: 'quota_exceeded' });
    await incrementUsage(me.id, 'STATUS_VIEW');
  }
  const { data } = await supabase
    .from('statuses')
    .select('*, profiles(id, name, photos, gender, is_invisible, is_premium, trial_started_at)')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  const rows = data || [];
  const hiddenAuthorIds = [...new Set(
    rows
      .filter((row) => row?.profiles?.id && row?.profiles?.is_invisible && row?.profiles?.id !== me.id)
      .map((row) => row.profiles.id)
  )];
  const invisibleEligibleBySubscription = new Set();
  if (hiddenAuthorIds.length > 0) {
    const { data: authorSubs } = await supabase
      .from('subscriptions')
      .select('user_id, plan_id')
      .in('user_id', hiddenAuthorIds)
      .eq('status', 'active')
      .gt('current_period_end', new Date().toISOString());

    for (const row of (authorSubs || [])) {
      if (row?.user_id && hasInvisiblePremiumAccessForPlan(rows.find((item) => item?.profiles?.id === row.user_id)?.profiles, row?.plan_id)) {
        invisibleEligibleBySubscription.add(row.user_id);
      }
    }
  }

  const filtered = rows.filter((row) => {
    const author = row?.profiles || null;
    if (!author) return true;
    if (String(author.id) === String(me.id)) return true;
    const authorHidden = isHiddenByInvisibleMode(
      author,
      invisibleEligibleBySubscription.has(author.id)
    );
    return !authorHidden;
  });

  const likesCountByStatusId = {};
  const likedByMeStatusIds = new Set();
  const statusIds = filtered.map((row) => row?.id).filter(Boolean);

  if (statusIds.length > 0) {
    const { data: likeRows, error: likesError } = await supabase
      .from('status_likes')
      .select('status_id, user_id')
      .in('status_id', statusIds);

    if (!likesError) {
      for (const row of (likeRows || [])) {
        const statusId = row?.status_id;
        const likerId = row?.user_id;
        if (!statusId || !likerId) continue;
        likesCountByStatusId[statusId] = (likesCountByStatusId[statusId] || 0) + 1;
        if (String(likerId) === String(me.id)) {
          likedByMeStatusIds.add(statusId);
        }
      }
    } else if (!isMissingRelationError(likesError)) {
      return res.status(500).json({ error: likesError.message });
    }
  }

  const payload = filtered.map((row) => ({
    ...row,
    likes_count: likesCountByStatusId[row.id] || 0,
    liked_by_me: likedByMeStatusIds.has(row.id),
  }));

  res.json(payload);
});

app.post('/api/statuses', requireAuth, async (req, res) => {
  const { mediaUrl, type, content } = req.body;
  const me = req.user;

  if (!hasStandardAccess(me)) {
    return res.status(403).json({ error: 'subscription_required' });
  }

  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const { data, error } = await supabase.from('statuses').insert({
    user_id: me.id,
    media_url: mediaUrl,
    message_type: type,
    content: content || '',
    expires_at: expiresAt
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/statuses/:id/like', requireAuth, async (req, res) => {
  const me = req.user;
  const statusId = String(req.params.id || '').trim();
  if (!statusId) return res.status(400).json({ error: 'invalid_status_id' });

  const { data: statusRow, error: statusError } = await supabase
    .from('statuses')
    .select('id, user_id, expires_at')
    .eq('id', statusId)
    .maybeSingle();

  if (statusError) return res.status(500).json({ error: statusError.message });
  if (!statusRow) return res.status(404).json({ error: 'status_not_found' });
  if (new Date(statusRow.expires_at) <= new Date()) return res.status(404).json({ error: 'status_expired' });
  if (String(statusRow.user_id) === String(me.id)) return res.status(400).json({ error: 'cannot_like_own_status' });

  const { error: likeError } = await supabase
    .from('status_likes')
    .upsert(
      { status_id: statusId, user_id: me.id },
      { onConflict: 'status_id,user_id', ignoreDuplicates: true }
    );
  if (likeError) {
    if (isMissingRelationError(likeError)) {
      return res.status(503).json({ error: 'story_likes_schema_missing' });
    }
    return res.status(500).json({ error: likeError.message });
  }

  await createStoryLikeNotificationIfNeeded({
    recipientId: statusRow.user_id,
    storyId: statusId,
    likerProfile: me,
  });

  res.json({ success: true });
});

app.delete('/api/statuses/:id/like', requireAuth, async (req, res) => {
  const me = req.user;
  const statusId = String(req.params.id || '').trim();
  if (!statusId) return res.status(400).json({ error: 'invalid_status_id' });

  const { error } = await supabase
    .from('status_likes')
    .delete()
    .eq('status_id', statusId)
    .eq('user_id', me.id);

  if (error) {
    if (isMissingRelationError(error)) {
      return res.status(503).json({ error: 'story_likes_schema_missing' });
    }
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true });
});

app.get('/api/statuses/:id/likes', requireAuth, async (req, res) => {
  const me = req.user;
  const statusId = String(req.params.id || '').trim();
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 50)));
  if (!statusId) return res.status(400).json({ error: 'invalid_status_id' });

  const { data: statusRow, error: statusError } = await supabase
    .from('statuses')
    .select('id, user_id')
    .eq('id', statusId)
    .maybeSingle();
  if (statusError) return res.status(500).json({ error: statusError.message });
  if (!statusRow) return res.status(404).json({ error: 'status_not_found' });
  if (String(statusRow.user_id) !== String(me.id)) return res.status(403).json({ error: 'forbidden' });

  const { data: likesRows, error: likesError } = await supabase
    .from('status_likes')
    .select('user_id, created_at')
    .eq('status_id', statusId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (likesError) {
    if (isMissingRelationError(likesError)) {
      return res.json({ likes: [], count: 0 });
    }
    return res.status(500).json({ error: likesError.message });
  }

  const likerIds = [...new Set((likesRows || []).map((row) => row?.user_id).filter(Boolean))];
  const profilesById = {};
  if (likerIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, photos')
      .in('id', likerIds);
    if (profilesError) return res.status(500).json({ error: profilesError.message });
    for (const profile of (profiles || [])) {
      profilesById[profile.id] = profile;
    }
  }

  const likes = (likesRows || []).map((row) => ({
    user_id: row.user_id,
    created_at: row.created_at,
    profile: {
      id: row.user_id,
      name: profilesById[row.user_id]?.name || 'Utilisateur',
      photo: Array.isArray(profilesById[row.user_id]?.photos) ? (profilesById[row.user_id].photos[0] || null) : null,
    },
  }));

  res.json({ likes, count: likes.length });
});

const handleSuperLikesReceived = async (req, res) => {
  const { data, error } = await supabase.from('super_likes')
    .select('*, profiles:sender_id(id, name, photos, age, bio, is_invisible, gender, is_premium, trial_started_at)')
    .eq('recipient_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  const rows = data || [];
  const senderIds = [...new Set(rows.map((row) => row?.sender_id).filter(Boolean))];
  const invisibleEligibleBySubscription = new Set();
  if (senderIds.length > 0) {
    const { data: senderSubs } = await supabase
      .from('subscriptions')
      .select('user_id, plan_id')
      .in('user_id', senderIds)
      .eq('status', 'active')
      .gt('current_period_end', new Date().toISOString());

    for (const row of (senderSubs || [])) {
      if (row?.user_id && hasInvisiblePremiumAccessForPlan(rows.find((item) => item?.profiles?.id === row.user_id)?.profiles, row?.plan_id)) {
        invisibleEligibleBySubscription.add(row.user_id);
      }
    }
  }

  const filtered = rows.filter((row) => {
    const senderProfile = row?.profiles || null;
    const senderId = row?.sender_id;
    return !isHiddenByInvisibleMode(
      senderProfile,
      invisibleEligibleBySubscription.has(senderId)
    );
  });

  res.json(filtered);
};

app.get('/api/super-likes/received', requireAuth, handleSuperLikesReceived);
app.get('/api/premium/likes-received', requireAuth, handleSuperLikesReceived);

app.post('/api/super-likes/:id/respond', requireAuth, async (req, res) => {
  const { action } = req.body; // 'ACCEPT' or 'DECLINE'
  const { id } = req.params;
  const status = action === 'ACCEPT' ? 'ACCEPTED' : 'IGNORED';

  const { data: sl, error: fetchErr } = await supabase.from('super_likes').select('*').eq('id', id).single();
  if (fetchErr || !sl) return res.status(404).json({ error: 'not_found' });

  if (sl.recipient_id !== req.user.id) return res.status(403).json({ error: 'unauthorized' });

  const respondedAt = new Date().toISOString();
  const { error } = await supabase.from('super_likes').update({ status, responded_at: respondedAt }).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  if (action === 'ACCEPT') {
    await supabase.from('likes').upsert({ liker_id: sl.sender_id, liked_id: sl.recipient_id, is_super_like: true });
    await supabase.from('likes').upsert({ liker_id: sl.recipient_id, liked_id: sl.sender_id, is_super_like: false });
  }

  res.json({
    success: true,
    superLike: {
      id,
      status,
      responded_at: respondedAt,
    },
  });
});

app.get('/api/privacy/export', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const exportedAt = new Date().toISOString();

  const [profileRes, likesRes, matchesRes, messagesRes, subscriptionsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('likes').select('*').or(`liker_id.eq.${userId},liked_id.eq.${userId}`),
    supabase.from('matches').select('*').or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`),
    supabase.from('messages').select('*').eq('sender_id', userId),
    supabase.from('subscriptions').select('*').eq('user_id', userId),
  ]);

  res.json({
    filename: `yamo-export-${userId}.json`,
    exported_at: exportedAt,
    format: 'json',
    profile: profileRes.data || null,
    likes: likesRes.data || [],
    matches: matchesRes.data || [],
    messages: messagesRes.data || [],
    subscriptions: subscriptionsRes.data || [],
  });
});

app.post('/api/account/delete', requireAuth, async (req, res) => {
  const userId = req.user.id;
  await supabase.from('profiles').delete().eq('id', userId);
  await supabase.auth.admin.deleteUser(userId);
  res.json({ success: true });
});

app.get('/api/notifications/admin', requireAuth, async (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
  const { data, error } = await supabase
    .from('events')
    .select('id, event_type, event_name, metadata, created_at')
    .in('event_type', ['ADMIN_NOTIFICATION', 'STORY_NOTIFICATION'])
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingRelationError(error)) {
      return res.json({ notifications: [], unreadCount: 0 });
    }
    return res.status(500).json({ error: error.message });
  }

  const notifications = (data || []).map((item) => ({
    ...item,
    is_read: item.metadata?.is_read === true,
  }));
  const unreadCount = notifications.filter((item) => item.is_read !== true).length;
  res.json({ notifications, unreadCount });
});

app.post('/api/notifications/admin/:id/read', requireAuth, async (req, res) => {
  const id = req.params.id;
  const { data: item, error: fetchError } = await supabase
    .from('events')
    .select('id, user_id, metadata')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) return res.status(500).json({ error: fetchError.message });
  if (!item || item.user_id !== req.user.id) return res.status(404).json({ error: 'not_found' });

  const nextMetadata = {
    ...(item.metadata || {}),
    is_read: true,
    read_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('events').update({ metadata: nextMetadata }).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post('/api/notifications/admin/read-all', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('events')
    .select('id, metadata')
    .in('event_type', ['ADMIN_NOTIFICATION', 'STORY_NOTIFICATION'])
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });

  const updates = (data || []).map((item) => (
    supabase
      .from('events')
      .update({
        metadata: {
          ...(item.metadata || {}),
          is_read: true,
          read_at: new Date().toISOString(),
        },
      })
      .eq('id', item.id)
  ));
  if (updates.length > 0) await Promise.all(updates);
  res.json({ success: true });
});

app.get('/api/communities', requireAuth, async (req, res) => {
  const { data: communities, error } = await supabase
    .from('communities')
    .select('id, name, description, cover_photo, creator_id')
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingRelationError(error)) return res.json([]);
    return res.status(500).json({ error: error.message });
  }

  const communityIds = (communities || []).map((c) => c.id);
  if (communityIds.length === 0) return res.json([]);

  const [{ data: members, error: membersError }, { data: myMemberships, error: myMembershipsError }] = await Promise.all([
    supabase.from('community_members').select('community_id, user_id').in('community_id', communityIds),
    supabase.from('community_members').select('community_id').in('community_id', communityIds).eq('user_id', req.user.id),
  ]);
  if (membersError || myMembershipsError) {
    const relationError = membersError || myMembershipsError;
    if (isMissingRelationError(relationError)) return res.json([]);
    return res.status(500).json({ error: relationError?.message || 'community_members_fetch_failed' });
  }

  const memberCountByCommunity = {};
  for (const row of (members || [])) {
    memberCountByCommunity[row.community_id] = (memberCountByCommunity[row.community_id] || 0) + 1;
  }
  const myMembershipSet = new Set((myMemberships || []).map((row) => row.community_id));

  const payload = (communities || []).map((community) => ({
    ...community,
    member_count: memberCountByCommunity[community.id] || 0,
    is_member: myMembershipSet.has(community.id),
  }));
  res.json(payload);
});

app.post('/api/communities/create', requireAuth, async (req, res) => {
  const planKey = String(req.subscription?.plan_id || '').toUpperCase();
  if (!['BIANNUAL', 'ANNUAL'].includes(planKey)) {
    return res.status(403).json({ error: 'premium_required' });
  }

  const { name, description, cover_photo } = req.body || {};
  const { data: community, error } = await supabase.from('communities').insert({
    name,
    description,
    cover_photo,
    creator_id: req.user.id,
  }).select('id, name, description, cover_photo, creator_id').single();

  if (error) {
    if (isMissingRelationError(error)) return res.status(503).json({ error: 'community_schema_missing' });
    return res.status(500).json({ error: error.message });
  }
  const { error: membershipInsertError } = await supabase.from('community_members').upsert(
    {
      community_id: community.id,
      user_id: req.user.id,
      role: 'ADMIN',
    },
    { onConflict: 'community_id,user_id' }
  );
  if (membershipInsertError) {
    if (isMissingRelationError(membershipInsertError)) return res.status(503).json({ error: 'community_schema_missing' });
    return res.status(500).json({ error: membershipInsertError.message });
  }
  res.json({
    community: {
      ...community,
      member_count: 1,
      is_member: true,
    },
  });
});

app.post('/api/communities/:communityId/join', requireAuth, async (req, res) => {
  const { communityId } = req.params;
  const { data: community, error: communityError } = await supabase
    .from('communities')
    .select('id')
    .eq('id', communityId)
    .maybeSingle();
  if (communityError) return res.status(500).json({ error: communityError.message });
  if (!community) return res.status(404).json({ error: 'community_not_found' });

  const { error } = await supabase.from('community_members').upsert(
    {
      community_id: communityId,
      user_id: req.user.id,
      role: 'MEMBER',
    },
    { onConflict: 'community_id,user_id' }
  );
  if (error) {
    if (isMissingRelationError(error)) return res.status(503).json({ error: 'community_schema_missing' });
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true });
});

app.get('/api/communities/:communityId/messages', requireAuth, async (req, res) => {
  const { communityId } = req.params;
  const { data, error } = await supabase
    .from('community_messages')
    .select('id, content, message_type, media_url, created_at, sender_id, profiles:sender_id(name, photos)')
    .eq('community_id', communityId)
    .order('created_at', { ascending: true });
  if (error) {
    if (isMissingRelationError(error)) return res.json([]);
    return res.status(500).json({ error: error.message });
  }
  res.json(data || []);
});

app.post('/api/communities/:communityId/messages', requireAuth, async (req, res) => {
  const { communityId } = req.params;
  const { content, message_type, media_url } = req.body || {};

  const { data: membership, error: membershipError } = await supabase
    .from('community_members')
    .select('user_id')
    .eq('community_id', communityId)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (membershipError) {
    if (isMissingRelationError(membershipError)) return res.status(503).json({ error: 'community_schema_missing' });
    return res.status(500).json({ error: membershipError.message });
  }
  if (!membership) return res.status(403).json({ error: 'community_membership_required' });

  const { data, error } = await supabase.from('community_messages').insert({
    community_id: communityId,
    sender_id: req.user.id,
    content: content || '',
    message_type: message_type || 'TEXT',
    media_url: media_url || null,
  }).select('id, content, message_type, media_url, created_at, sender_id').single();
  if (error) {
    if (isMissingRelationError(error)) return res.status(503).json({ error: 'community_schema_missing' });
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

app.get('/api/communities/:communityId/members', requireAuth, async (req, res) => {
  const { communityId } = req.params;
  const { data, error } = await supabase
    .from('community_members')
    .select('user_id, role, joined_at, profiles:user_id(name, photos, is_verified, is_premium)')
    .eq('community_id', communityId)
    .order('joined_at', { ascending: true });
  if (error) {
    if (isMissingRelationError(error)) return res.json({ members: [] });
    return res.status(500).json({ error: error.message });
  }
  res.json({ members: data || [] });
});

app.patch('/api/communities/:communityId/members/:userId/role', requireAuth, async (req, res) => {
  const { communityId, userId } = req.params;
  const { role } = req.body || {};

  const { data: me, error: meError } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (meError) {
    if (isMissingRelationError(meError)) return res.status(503).json({ error: 'community_schema_missing' });
    return res.status(500).json({ error: meError.message });
  }
  if (!me || me.role !== 'ADMIN') return res.status(403).json({ error: 'admin_required' });

  const { error } = await supabase
    .from('community_members')
    .update({ role })
    .eq('community_id', communityId)
    .eq('user_id', userId);
  if (error) {
    if (isMissingRelationError(error)) return res.status(503).json({ error: 'community_schema_missing' });
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true });
});

app.delete('/api/communities/:communityId/members/:userId', requireAuth, async (req, res) => {
  const { communityId, userId } = req.params;

  const { data: me, error: meError } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (meError) {
    if (isMissingRelationError(meError)) return res.status(503).json({ error: 'community_schema_missing' });
    return res.status(500).json({ error: meError.message });
  }
  if (!me) return res.status(403).json({ error: 'community_membership_required' });
  if (req.user.id !== userId && !['ADMIN', 'MODERATOR'].includes(String(me.role))) {
    return res.status(403).json({ error: 'insufficient_permissions' });
  }

  const { error } = await supabase
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', userId);
  if (error) {
    if (isMissingRelationError(error)) return res.status(503).json({ error: 'community_schema_missing' });
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true });
});

// --- ADMIN & STATS ---

adminRouter.get('/stats', async (req, res) => {
  const [{ data: profiles }, { data: subscriptions }, { data: kyc }, { data: reports }, { data: privacy }] = await Promise.all([
    supabase.from('profiles').select('id, is_admin, is_verified, is_premium, is_invisible, suspended_at'),
    supabase.from('subscriptions').select('plan_id, status').eq('status', 'active'),
    supabase.from('kyc_verifications').select('status, created_at'),
    supabase.from('reports').select('status'),
    supabase.from('privacy_requests').select('status'),
  ]);

  const users = profiles || [];
  const activeUsers = users.filter((u) => !u.suspended_at);
  const suspendedUsers = users.filter((u) => !!u.suspended_at);
  const verifiedUsers = users.filter((u) => !!u.is_verified);
  const premiumUsers = users.filter((u) => !!u.is_premium);
  const planCounts = { MONTHLY: 0, QUARTERLY: 0, BIANNUAL: 0, ANNUAL: 0, UNKNOWN: 0 };
  for (const subscription of (subscriptions || [])) {
    const planKey = String(subscription.plan_id || '').toUpperCase();
    if (planCounts[planKey] !== undefined) planCounts[planKey] += 1;
    else planCounts.UNKNOWN += 1;
  }

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  res.json({
    generatedAt: new Date().toISOString(),
    users: {
      total: users.length,
      active: activeUsers.length,
      suspended: suspendedUsers.length,
      admins: users.filter((u) => !!u.is_admin).length,
      verified: verifiedUsers.length,
      unverified: users.length - verifiedUsers.length,
      premium: premiumUsers.length,
      free: users.length - premiumUsers.length,
      invisiblePremium: users.filter((u) => !!u.is_premium && !!u.is_invisible).length,
    },
    premiumByPlan: planCounts,
    kyc: {
      totalRequests: (kyc || []).length,
      pending: (kyc || []).filter((i) => i.status === 'PENDING').length,
      inReview: (kyc || []).filter((i) => i.status === 'IN_REVIEW').length,
      approved: (kyc || []).filter((i) => i.status === 'APPROVED').length,
      rejected: (kyc || []).filter((i) => i.status === 'REJECTED').length,
      requestsLast7Days: (kyc || []).filter((i) => new Date(i.created_at).getTime() >= sevenDaysAgo).length,
    },
    moderation: {
      reportsTotal: (reports || []).length,
      reportsOpen: (reports || []).filter((i) => i.status === 'PENDING').length,
      reportsInReview: (reports || []).filter((i) => i.status === 'INVESTIGATING').length,
      reportsResolved: (reports || []).filter((i) => i.status === 'RESOLVED').length,
      reportsDismissed: (reports || []).filter((i) => i.status === 'DISMISSED').length,
    },
    privacy: {
      requestsTotal: (privacy || []).length,
      open: (privacy || []).filter((i) => i.status === 'PENDING').length,
      inProgress: (privacy || []).filter((i) => i.status === 'PROCESSING').length,
      resolved: (privacy || []).filter((i) => i.status === 'COMPLETED').length,
      rejected: (privacy || []).filter((i) => i.status === 'FAILED').length,
    },
    integrity: {
      authUsersTotal: null,
      profilesTotal: users.length,
      authUsersWithoutProfile: null,
    },
  });
});

adminRouter.get('/audit-logs', async (req, res) => {
  const limit = Math.max(1, Math.min(500, Number(req.query.limit || 200)));
  const actionFilter = String(req.query.action || '').trim().toUpperCase();

  let query = supabase
    .from('admin_audit_logs')
    .select('id, admin_id, action, target_id, target_type, old_data, new_data, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (actionFilter && actionFilter !== 'ALL') {
    query = query.eq('action', actionFilter);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingRelationError(error)) return res.json({ logs: [] });
    return res.status(500).json({ error: error.message });
  }

  const profileIds = [...new Set((data || []).flatMap((row) => [row.admin_id, row.target_id]).filter(Boolean))];
  let profileById = new Map();

  if (profileIds.length > 0) {
    const { data: profileRows, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', profileIds);
    if (profilesError) return res.status(500).json({ error: profilesError.message });
    profileById = new Map((profileRows || []).map((row) => [row.id, row]));
  }

  const logs = (data || []).map((row) => {
    const adminProfile = row.admin_id ? profileById.get(row.admin_id) : null;
    const targetProfile = row.target_id ? profileById.get(row.target_id) : null;
    const normalizedMetadata = (row.new_data && typeof row.new_data === 'object')
      ? row.new_data
      : (row.old_data && typeof row.old_data === 'object' ? row.old_data : null);

    return {
      id: row.id,
      admin_id: row.admin_id || null,
      action: row.action,
      target_user_id: row.target_id || null,
      reason: normalizedMetadata?.reason || null,
      metadata: normalizedMetadata,
      created_at: row.created_at,
      admin: row.admin_id ? {
        id: row.admin_id,
        name: adminProfile?.name || 'Admin',
        email: null,
      } : null,
      target_user: row.target_id ? {
        id: row.target_id,
        name: targetProfile?.name || 'Utilisateur',
        email: null,
      } : null,
    };
  });

  res.json({ logs });
});

adminRouter.get('/users', async (_req, res) => {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map((user) => ({ ...user, email: null })));
});

adminRouter.put('/users/:userId/suspend', async (req, res) => {
  const { userId } = req.params;
  const shouldSuspend = req.body?.suspend === true;
  const patch = { suspended_at: shouldSuspend ? new Date().toISOString() : null };
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, suspended: shouldSuspend });
});

adminRouter.delete('/users/:userId', async (req, res) => {
  const { userId } = req.params;
  const reason = String(req.body?.reason || '').trim() || null;

  await appendAdminAuditLog({
    adminId: req.user.id,
    action: 'USER_DELETE_ADMIN',
    targetUserId: userId,
    metadata: {
      reason,
      source: 'admin_delete_user',
      request_id: req.headers['x-request-id'] || null,
    },
  });

  const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId);
  if (profileError) return res.status(500).json({ error: profileError.message });
  await supabase.auth.admin.deleteUser(userId);
  res.json({ success: true });
});

adminRouter.post('/users/reconcile-profiles', async (_req, res) => {
  const existingProfiles = await supabase.from('profiles').select('id');
  const profileIdSet = new Set((existingProfiles.data || []).map((p) => p.id));

  let authUsers = [];
  try {
    const listResponse = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    authUsers = listResponse?.data?.users || [];
  } catch (_error) {
    authUsers = [];
  }

  const missing = authUsers.filter((user) => !profileIdSet.has(user.id));
  for (const user of missing) {
    await supabase.from('profiles').upsert({
      id: user.id,
      name: user.user_metadata?.full_name || user.email || 'Utilisateur',
      onboarding_completed: false,
      is_admin: false,
      is_verified: false,
      is_premium: false,
    });
  }

  const totalProfiles = (await supabase.from('profiles').select('id', { count: 'exact', head: true })).count || 0;
  res.json({
    createdCount: missing.length,
    missingBefore: missing.length,
    totalAuthUsers: authUsers.length,
    totalProfiles,
  });
});

adminRouter.get('/privacy-requests', async (req, res) => {
  const limit = Math.max(1, Math.min(500, Number(req.query.limit || 100)));
  const { data, error } = await supabase
    .from('privacy_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return res.status(500).json({ error: error.message });

  const requests = (data || []).map((item) => ({
    id: item.id,
    user_id: item.user_id,
    request_type: item.request_type === 'ACCOUNT_DELETION' ? 'DELETE' : 'EXPORT',
    status: normalizePrivacyStatusForClient(item.status),
    details: item.details || null,
    created_at: item.created_at,
    resolved_at: item.completed_at || null,
  }));
  res.json({ requests });
});

adminRouter.post('/privacy-requests/:id/resolve', async (req, res) => {
  const { id } = req.params;
  const statusForDb = normalizePrivacyStatusForDb(req.body?.status);
  if (!statusForDb) return res.status(400).json({ error: 'invalid_status' });

  const { data: current, error: fetchError } = await supabase
    .from('privacy_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) return res.status(500).json({ error: fetchError.message });
  if (!current) return res.status(404).json({ error: 'not_found' });

  const patch = {
    status: statusForDb,
    completed_at: (statusForDb === 'COMPLETED' || statusForDb === 'FAILED') ? new Date().toISOString() : null,
  };

  const { error } = await supabase.from('privacy_requests').update(patch).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  if (req.body?.executeDelete === true && statusForDb === 'COMPLETED' && current.request_type === 'ACCOUNT_DELETION' && current.user_id) {
    await appendAdminAuditLog({
      adminId: req.user.id,
      action: 'USER_DELETE_PRIVACY',
      targetUserId: current.user_id,
      metadata: {
        reason: req.body?.reason || null,
        source: 'privacy_request',
        request_id: id,
      },
    });
    await supabase.from('profiles').delete().eq('id', current.user_id);
    await supabase.auth.admin.deleteUser(current.user_id);
  }

  res.json({ success: true });
});

adminRouter.get('/reports', async (req, res) => {
  const rawStatus = req.query.status;
  let query = supabase.from('reports').select('*').order('created_at', { ascending: false });
  if (rawStatus) {
    query = query.eq('status', normalizeReportStatusForDb(rawStatus));
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const profileIds = [
    ...new Set(
      (data || [])
        .flatMap((item) => [item.reporter_id, item.reported_user_id])
        .filter(Boolean)
    ),
  ];
  let profilesById = {};
  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', profileIds);
    if (profilesError) return res.status(500).json({ error: profilesError.message });
    profilesById = Object.fromEntries((profiles || []).map((profile) => [profile.id, profile]));
  }

  const reports = (data || []).map((item) => ({
    id: item.id,
    status: normalizeReportStatusForClient(item.status),
    category: item.reason || 'GENERAL',
    target_type: 'PROFILE',
    description: item.details || item.reason || '',
    created_at: item.created_at,
    reporter: item.reporter_id ? {
      id: item.reporter_id,
      name: profilesById[item.reporter_id]?.name || 'Utilisateur',
      email: null,
    } : null,
    reported_user: item.reported_user_id ? {
      id: item.reported_user_id,
      name: profilesById[item.reported_user_id]?.name || 'Utilisateur',
      email: null,
    } : null,
  }));
  res.json({ reports });
});

adminRouter.post('/reports/:id/review', async (req, res) => {
  const { id } = req.params;
  const statusForDb = normalizeReportStatusForDb(req.body?.status);
  const { error } = await supabase.from('reports').update({ status: statusForDb }).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

adminRouter.get('/photo-reviews', async (req, res) => {
  const status = String(req.query.status || 'PENDING').toUpperCase();
  const limit = Math.max(1, Math.min(200, Number(req.query.limit || 50)));
  const page = Math.max(1, Number(req.query.page || 1));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from('photo_review_queue')
    .select('*', { count: 'exact' })
    .eq('status', status)
    .order('created_at', { ascending: true })
    .range(from, to);
  if (error) return res.status(500).json({ error: error.message });

  const userIds = [...new Set((data || []).map((item) => item.user_id).filter(Boolean))];
  let profilesById = {};
  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', userIds);
    if (profilesError) return res.status(500).json({ error: profilesError.message });
    profilesById = Object.fromEntries((profiles || []).map((profile) => [profile.id, profile]));
  }

  const reviews = (data || []).map((item) => ({
    ...item,
    user: item.user_id ? {
      id: item.user_id,
      name: profilesById[item.user_id]?.name || 'Utilisateur',
      email: null,
    } : null,
  }));

  const safeCount = count || 0;
  res.json({
    reviews,
    page,
    hasMore: page * limit < safeCount,
  });
});

adminRouter.post('/photo-reviews/:id/review', async (req, res) => {
  const { id } = req.params;
  const nextStatus = String(req.body?.status || '').toUpperCase();
  const patch = {
    status: nextStatus,
    reviewed_at: new Date().toISOString(),
    rejection_reason: nextStatus === 'REJECTED' ? (req.body?.note || 'rejected_by_admin') : null,
  };
  const { data: row, error: fetchError } = await supabase.from('photo_review_queue').select('*').eq('id', id).maybeSingle();
  if (fetchError) return res.status(500).json({ error: fetchError.message });
  if (!row) return res.status(404).json({ error: 'not_found' });

  const { error } = await supabase.from('photo_review_queue').update(patch).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  if (nextStatus === 'APPROVED') {
    await supabase.from('profiles').update({ photo_review_status: 'APPROVED' }).eq('id', row.user_id);
  }
  if (nextStatus === 'REJECTED') {
    await supabase.from('profiles').update({ photo_review_status: 'REJECTED' }).eq('id', row.user_id);
  }
  res.json({ success: true });
});

adminRouter.get('/kyc/requests', async (req, res) => {
  const status = String(req.query.status || 'ALL').toUpperCase();
  let query = supabase
    .from('kyc_verifications')
    .select('*')
    .order('created_at', { ascending: false });
  if (status !== 'ALL') query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const userIds = [...new Set((data || []).map((item) => item.user_id).filter(Boolean))];
  let profilesById = {};
  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, is_verified, is_premium, suspended_at, photos')
      .in('id', userIds);
    if (profilesError) return res.status(500).json({ error: profilesError.message });
    profilesById = Object.fromEntries((profiles || []).map((profile) => [profile.id, profile]));
  }

  const requests = (data || []).map((item) => ({
    id: item.id,
    user_id: item.user_id,
    document_type: item.document_type,
    status: item.status,
    submitted_at: item.submitted_at || item.created_at,
    reviewed_at: item.reviewed_at || null,
    rejection_reason: item.rejection_reason || null,
    document_front_url: item.document_front_url || item.document_url || null,
    document_back_url: item.document_back_url || null,
    selfie_url: item.selfie_url || null,
    user: {
      id: profilesById[item.user_id]?.id || item.user_id,
      name: profilesById[item.user_id]?.name || 'Utilisateur',
      email: null,
      is_verified: !!profilesById[item.user_id]?.is_verified,
      is_premium: !!profilesById[item.user_id]?.is_premium,
      suspended_at: profilesById[item.user_id]?.suspended_at || null,
      photo: Array.isArray(profilesById[item.user_id]?.photos) ? (profilesById[item.user_id].photos[0] || null) : null,
    },
  }));
  res.json({ requests });
});

adminRouter.post('/kyc/requests/:id/review', async (req, res) => {
  const { id } = req.params;
  const decision = String(req.body?.decision || '').toUpperCase();
  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    return res.status(400).json({ error: 'invalid_decision' });
  }

  const { data: row, error: fetchError } = await supabase
    .from('kyc_verifications')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) return res.status(500).json({ error: fetchError.message });
  if (!row) return res.status(404).json({ error: 'not_found' });

  const patch = {
    status: decision,
    reviewed_at: new Date().toISOString(),
    rejection_reason: decision === 'REJECTED' ? (req.body?.reason || 'rejected_by_admin') : null,
  };
  const { error } = await supabase.from('kyc_verifications').update(patch).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  if (decision === 'APPROVED') {
    await supabase.from('profiles').update({ is_verified: true, is_kyc_verified: true }).eq('id', row.user_id);
  }
  res.json({ success: true });
});

adminRouter.get('/messages/audience', async (req, res) => {
  const segment = String(req.query.segment || 'ALL').toUpperCase();
  const { data, error } = await supabase.from('profiles').select('id, is_verified, is_premium, is_invisible, suspended_at');
  if (error) return res.status(500).json({ error: error.message });

  const filter = buildUserSegmentFilter(segment);
  const recipientCount = (data || []).filter(filter).length;
  res.json({ segment, recipientCount });
});

adminRouter.post('/messages/broadcast', async (req, res) => {
  const segment = String(req.body?.segment || 'ALL').toUpperCase();
  const title = String(req.body?.title || '').trim() || 'Information administrateur';
  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json({ error: 'message_required' });

  const { data: users, error } = await supabase.from('profiles').select('id, is_verified, is_premium, is_invisible, suspended_at');
  if (error) return res.status(500).json({ error: error.message });

  const filter = buildUserSegmentFilter(segment);
  const recipients = (users || []).filter(filter).map((user) => user.id);
  const sentAt = new Date().toISOString();
  const broadcastId = `broadcast_${Date.now()}`;

  const notificationRows = recipients.map((userId) => ({
    user_id: userId,
    event_type: 'ADMIN_NOTIFICATION',
    event_name: 'ADMIN_BROADCAST',
    metadata: {
      title,
      message,
      segment,
      sent_at: sentAt,
      broadcast_id: broadcastId,
      is_read: false,
    },
  }));

  if (notificationRows.length > 0) {
    const { error: insertError } = await supabase.from('events').insert(notificationRows);
    if (insertError) return res.status(500).json({ error: insertError.message });
  }

  await supabase.from('events').insert({
    user_id: req.user.id,
    event_type: 'ADMIN_CAMPAIGN',
    event_name: title,
    payload: {
      message,
      segment,
      recipientCount: recipients.length,
      sentAt,
      broadcastId,
    },
    metadata: {},
  });

  res.json({
    recipientCount: recipients.length,
    segment,
    sentAt,
    broadcastId,
  });
});

adminRouter.get('/messages/history', async (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
  const { data, error } = await supabase
    .from('events')
    .select('id, event_name, payload, created_at')
    .eq('event_type', 'ADMIN_CAMPAIGN')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return res.status(500).json({ error: error.message });

  const campaigns = (data || []).map((item) => ({
    campaignId: item.id,
    title: item.event_name || item.payload?.title || 'Campagne',
    message: item.payload?.message || '',
    segment: item.payload?.segment || 'ALL',
    sentAt: item.payload?.sentAt || item.created_at,
    recipientCount: Number(item.payload?.recipientCount || 0),
    readCount: 0,
  }));
  res.json({ campaigns });
});

app.use('/api/admin', requireAuth, requireAdmin, adminRouter);
app.get('/health', (req, res) => res.json({ status: 'ok', sentry: 'active', paystack: 'ready' }));

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 YAMO Production Finalized on port ${PORT}`));
