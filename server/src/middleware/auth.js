const { auth, db } = require('../config/firebase');
const { getLatestActiveSubscriptionForUser, refreshSubscriptionAutoRenewalForUser } = require('../services/subscriptionService');

/**
 * FIREBASE AUTH MIDDLEWARE
 * Verifies the ID Token from the client and attaches the Firestore profile to req.user
 */
const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'missing_token' });

  if (!auth || !db) {
    return res.status(500).json({ error: 'firebase_not_initialized' });
  }

  try {
    // 1. Verify ID Token
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // 2. Fetch profile from Firestore
    const profileDoc = await db.collection('profiles').doc(userId).get();

    if (!profileDoc.exists) {
      return res.status(403).json({ error: 'profile_not_found', userId });
    }

    let profile = { id: profileDoc.id, ...profileDoc.data() };

    // 3. Check Subscriptions (Migration needed for subscriptionService)
    let sub = await getLatestActiveSubscriptionForUser(userId);
    if (!sub) {
      sub = await refreshSubscriptionAutoRenewalForUser(userId);
    }

    // 4. Sync flags (Premium, VIP)
    const isPremium = !!sub;
    const isVip = isPremium && ['BIANNUAL', 'ANNUAL'].includes(sub.plan_id?.toUpperCase());

    if (profile.is_premium !== isPremium || profile.is_vip !== isVip) {
      await db.collection('profiles').doc(userId).update({
        is_premium: isPremium,
        is_vip: isVip
      });
      profile.is_premium = isPremium;
      profile.is_vip = isVip;
    }

    // 5. Update Last Active
    try {
      const now = new Date();
      const lastActiveTs = profile.last_active_at ? new Date(profile.last_active_at).getTime() : 0;
      if (!lastActiveTs || (now.getTime() - lastActiveTs) >= 5 * 60 * 1000) {
        await db.collection('profiles').doc(userId).update({
          last_active_at: now.toISOString()
        });
        profile.last_active_at = now.toISOString();
      }
    } catch (_e) {}

    req.user = profile;
    req.subscription = sub;
    req.authUser = decodedToken;
    next();
  } catch (e) {
    console.error('Auth middleware error:', e);
    if (e.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'token_expired' });
    }
    res.status(401).json({ error: 'invalid_token' });
  }
};

const requireAdmin = (req, res, next) => req.user?.is_admin ? next() : res.status(403).json({ error: 'admin_required' });

/**
 * BASE FIREBASE AUTH MIDDLEWARE
 * Only verifies the ID Token, doesn't require a Firestore profile
 */
const requireBaseAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'missing_token' });

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.authUser = decodedToken;
    next();
  } catch (e) {
    res.status(401).json({ error: 'invalid_token' });
  }
};

module.exports = { requireAuth, requireAdmin, requireBaseAuth };
