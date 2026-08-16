const { db, bucket } = require('../config/firebase');
const { hasInvisiblePremiumAccessForPlan, isHiddenByInvisibleMode } = require('../services/accessService');
const { getDailyUsage, incrementUsage, consumeStoryPurchase, hasUnusedStoryPurchase, hasStoryPurchaseAccess } = require('../services/usageService');
const { createStoryLikeNotificationIfNeeded } = require('../services/notificationService');
const { QUOTAS } = require('../config/constants');

const STORY_PAGE_LIMIT = 10;
const STORY_MAX_LIMIT = 60;
const STORY_PURCHASE_VIEW_LIMIT = 10;

const hasStorySubscriptionAccess = (profile) => !!(profile?.is_premium || profile?.is_vip);

const toPublicProfile = (p) => {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    age: p.age,
    bio: p.bio,
    photos: p.photos,
    photo_variants: p.photo_variants || {},
    city: p.city,
    gender: p.gender,
    is_verified: p.is_verified,
    is_premium: p.is_premium,
    galanterie_score: p.galanterie_score,
    boosted_until: p.boosted_until || null,
    is_vip: p.is_vip || false
  };
};

const chunkArray = (items, size = 30) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

const clampLimit = (value, fallback = STORY_PAGE_LIMIT, max = STORY_MAX_LIMIT) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(parsed)));
};

const clampOffset = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(500, Math.floor(parsed)));
};

const getStatuses = async (req, res) => {
  const me = req.user;
  const hasFullAccess = hasStorySubscriptionAccess(me);
  const hasPaidLimitedAccess = hasFullAccess ? false : await hasStoryPurchaseAccess(me.id);
  if (!hasFullAccess && !hasPaidLimitedAccess) return res.status(403).json({ error: 'subscription_required' });

  try {
    if (String(me.gender || '').toUpperCase() === 'MALE' && req.subscription?.plan_id === 'QUARTERLY' && !!me.is_invisible) {
      const u = await getDailyUsage(me.id, 'STATUS_VIEW');
      if (u.usage_count >= QUOTAS.MEN_3M_STATUS_VIEWS) return res.status(403).json({ error: 'quota_exceeded' });
      await incrementUsage(me.id, 'STATUS_VIEW');
    }

    const now = new Date().toISOString();
    const requestedOffset = clampOffset(req.query.offset);
    const offset = hasFullAccess ? requestedOffset : Math.min(requestedOffset, STORY_PURCHASE_VIEW_LIMIT);
    const maxLimit = hasFullAccess ? STORY_MAX_LIMIT : STORY_PURCHASE_VIEW_LIMIT;
    const safeLimit = clampLimit(req.query.limit, STORY_PAGE_LIMIT, maxLimit);
    const remainingLimitedStories = hasFullAccess ? safeLimit : Math.max(0, STORY_PURCHASE_VIEW_LIMIT - offset);
    const effectiveLimit = Math.min(safeLimit, remainingLimitedStories);

    if (effectiveLimit <= 0) return res.json([]);

    const snapshot = await db.collection('statuses')
      .where('expires_at', '>', now)
      .limit(Math.min((offset + effectiveLimit) * 2, hasFullAccess ? 140 : 30))
      .get();
    let rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
      .slice(offset, offset + effectiveLimit);

    // Hydrate Profiles
    const authors = await Promise.all(rows.map(async row => {
      const profileDoc = await db.collection('profiles').doc(row.user_id).get();
      return profileDoc.exists ? toPublicProfile({ id: profileDoc.id, ...profileDoc.data() }) : null;
    }));

    rows = rows.map((row, i) => ({ ...row, profiles: authors[i] })).filter(r => !!r.profiles);

    // Filter Invisible
    const invisibleEligibleBySubscription = new Set();
    const hiddenAuthorIds = [...new Set(rows.filter(r => r.profiles.is_invisible && r.user_id !== me.id).map(r => r.user_id))];

    if (hiddenAuthorIds.length > 0) {
      for (let i = 0; i < hiddenAuthorIds.length; i += 30) {
        const chunk = hiddenAuthorIds.slice(i, i + 30);
        const subSnapshot = await db.collection('subscriptions')
          .where('user_id', 'in', chunk)
          .get();
        subSnapshot.forEach(doc => {
          const subscription = doc.data();
          const isActive = subscription.status === 'active' &&
            (!subscription.current_period_end || subscription.current_period_end > now);
          const profile = rows.find(r => r.user_id === subscription.user_id)?.profiles;
          if (isActive && profile && hasInvisiblePremiumAccessForPlan(profile, subscription.plan_id)) {
            invisibleEligibleBySubscription.add(subscription.user_id);
          }
        });
      }
    }

    const filtered = rows.filter(r => {
      if (r.user_id === me.id) return true;
      return !isHiddenByInvisibleMode(r.profiles, invisibleEligibleBySubscription.has(r.user_id));
    });

    // Likes hydration
    const statusIds = filtered.map(r => r.id);
    const likesCount = {};
    const likedByMe = new Set();
    for (const chunk of chunkArray(statusIds)) {
      if (chunk.length === 0) continue;
      const likesSnap = await db.collection('status_likes').where('status_id', 'in', chunk).get();
      likesSnap.forEach(doc => {
        const data = doc.data();
        likesCount[data.status_id] = (likesCount[data.status_id] || 0) + 1;
        if (data.user_id === me.id) likedByMe.add(data.status_id);
      });
    }

    res.json(filtered.map(r => ({
      ...r,
      likes_count: likesCount[r.id] || 0,
      liked_by_me: likedByMe.has(r.id)
    })));

  } catch (error) { res.status(500).json({ error: error.message }); }
};

const createStatus = async (req, res) => {
  const { mediaUrl, thumbnailUrl, type, content } = req.body;
  const me = req.user;

  // 1. Check for Premium or VIP story publishing access
  let hasAccess = hasStorySubscriptionAccess(me);

  // 2. If no subscription, check for a one-time Story Purchase
  if (!hasAccess) {
    const consumed = await consumeStoryPurchase(me.id);
    if (consumed) {
      hasAccess = true;
    }
  }

  if (!hasAccess) return res.status(403).json({ error: 'subscription_required' });

  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  try {
    const data = {
      user_id: me.id,
      media_url: mediaUrl,
      thumbnail_url: thumbnailUrl || null,
      message_type: type,
      content: content || '',
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    };
    const ref = await db.collection('statuses').add(data);
    res.json({ id: ref.id, ...data });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getUploadAccess = async (req, res) => {
  const me = req.user;
  const canPublishForFree = hasStorySubscriptionAccess(me);
  const hasPurchasedUpload = canPublishForFree ? false : await hasUnusedStoryPurchase(me.id);
  const hasPurchasedViewAccess = canPublishForFree ? false : await hasStoryPurchaseAccess(me.id);

  res.json({
    canPublishForFree,
    hasPurchasedUpload,
    hasPurchasedViewAccess,
    canView: canPublishForFree || hasPurchasedViewAccess,
    viewLimit: canPublishForFree ? STORY_MAX_LIMIT : (hasPurchasedViewAccess ? STORY_PURCHASE_VIEW_LIMIT : 0),
    canPublish: canPublishForFree || hasPurchasedUpload
  });
};

const deleteStatus = async (req, res) => {
  const statusId = req.params.id;
  const me = req.user;

  try {
    const statusRef = db.collection('statuses').doc(statusId);
    const statusDoc = await statusRef.get();
    if (!statusDoc.exists) return res.status(404).json({ error: 'status_not_found' });
    const status = statusDoc.data();
    if (status.user_id !== me.id) return res.status(403).json({ error: 'unauthorized' });

    for (const mediaPath of [status.media_url, status.thumbnail_url].filter(Boolean)) {
      try {
        const file = bucket.file(`statuses/${mediaPath}`);
        const [exists] = await file.exists();
        if (exists) await file.delete();
      } catch (storageErr) {
        console.error(`[STATUS] Error deleting media for ${statusId}:`, storageErr.message);
      }
    }

    const likesSnap = await db.collection('status_likes').where('status_id', '==', statusId).get();
    const batch = db.batch();
    likesSnap.docs.forEach(doc => batch.delete(doc.ref));
    batch.delete(statusRef);
    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const likeStatus = async (req, res) => {
  const me = req.user;
  const statusId = req.params.id;
  try {
    const statusDoc = await db.collection('statuses').doc(statusId).get();
    if (!statusDoc.exists) return res.status(404).json({ error: 'status_not_found' });
    const status = statusDoc.data();
    if (status.user_id === me.id) return res.status(400).json({ error: 'cannot_like_own_status' });

    await db.collection('status_likes').doc(`${statusId}_${me.id}`).set({
      status_id: statusId,
      user_id: me.id,
      created_at: new Date().toISOString()
    });

    await createStoryLikeNotificationIfNeeded({ recipientId: status.user_id, storyId: statusId, likerProfile: me });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const unlikeStatus = async (req, res) => {
  try {
    await db.collection('status_likes').doc(`${req.params.id}_${req.user.id}`).delete();
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getStatusLikes = async (req, res) => {
  const statusId = req.params.id;
  const me = req.user;
  try {
    const statusDoc = await db.collection('statuses').doc(statusId).get();
    if (!statusDoc.exists) return res.status(404).json({ error: 'status_not_found' });
    if (statusDoc.data().user_id !== me.id) return res.status(403).json({ error: 'unauthorized' });

    const snap = await db.collection('status_likes').where('status_id', '==', statusId).get();
    const likes = await Promise.all(snap.docs.map(async doc => {
      const data = doc.data();
      const pDoc = await db.collection('profiles').doc(data.user_id).get();
      return { user_id: data.user_id, created_at: data.created_at, profile: pDoc.exists ? toPublicProfile({ id: pDoc.id, ...pDoc.data() }) : null };
    }));

    const filtered = likes
      .filter(l => !!l.profile && !l.profile.suspended_at && l.profile.onboarding_completed !== false)
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

    const likerIds = filtered.map(l => l.user_id);
    const likedBackIds = new Set();
    const matchedIds = new Set();

    for (const chunk of chunkArray(likerIds)) {
      if (chunk.length === 0) continue;
      await Promise.all(chunk.map(async otherUserId => {
        const likedBackDoc = await db.collection('likes').doc(`${me.id}_${otherUserId}`).get();
        if (likedBackDoc.exists) likedBackIds.add(otherUserId);

        const [userOneId, userTwoId] = [me.id, otherUserId].sort();
        const matchDoc = await db.collection('matches').doc(`${userOneId}_${userTwoId}`).get();
        if (matchDoc.exists && matchDoc.data().status === 'ACTIVE') matchedIds.add(otherUserId);
      }));
    }

    res.json({
      likes: filtered.map(l => ({
        ...l,
        liked_back: likedBackIds.has(l.user_id),
        is_matched: matchedIds.has(l.user_id)
      })),
      count: filtered.length
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

module.exports = { getStatuses, createStatus, getUploadAccess, deleteStatus, likeStatus, unlikeStatus, getStatusLikes };
