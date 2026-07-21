const { db } = require('../config/firebase');
const { hasStandardAccess, hasInvisiblePremiumAccessForPlan, isHiddenByInvisibleMode } = require('../services/accessService');
const { getDailyUsage, incrementUsage, consumeStoryPurchase } = require('../services/usageService');
const { createStoryLikeNotificationIfNeeded } = require('../services/notificationService');
const { QUOTAS } = require('../config/constants');

const getStatuses = async (req, res) => {
  const me = req.user;
  if (!hasStandardAccess(me)) return res.status(403).json({ error: 'subscription_required' });

  try {
    if (String(me.gender || '').toUpperCase() === 'MALE' && req.subscription?.plan_id === 'QUARTERLY' && !!me.is_invisible) {
      const u = await getDailyUsage(me.id, 'STATUS_VIEW');
      if (u.usage_count >= QUOTAS.MEN_3M_STATUS_VIEWS) return res.status(403).json({ error: 'quota_exceeded' });
      await incrementUsage(me.id, 'STATUS_VIEW');
    }

    const now = new Date().toISOString();
    const snapshot = await db.collection('statuses').where('expires_at', '>', now).get();
    let rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Hydrate Profiles
    const authors = await Promise.all(rows.map(async row => {
      const profileDoc = await db.collection('profiles').doc(row.user_id).get();
      return profileDoc.exists ? { id: profileDoc.id, ...profileDoc.data() } : null;
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
          .where('status', '==', 'active')
          .where('current_period_end', '>', now)
          .get();
        subSnapshot.forEach(doc => {
          const profile = rows.find(r => r.user_id === doc.data().user_id).profiles;
          if (hasInvisiblePremiumAccessForPlan(profile, doc.data().plan_id)) {
            invisibleEligibleBySubscription.add(doc.data().user_id);
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
    const likesSnap = await db.collection('status_likes').where('status_id', 'in', statusIds.slice(0, 30)).get();

    const likesCount = {};
    const likedByMe = new Set();
    likesSnap.forEach(doc => {
      const data = doc.data();
      likesCount[data.status_id] = (likesCount[data.status_id] || 0) + 1;
      if (data.user_id === me.id) likedByMe.add(data.status_id);
    });

    res.json(filtered.map(r => ({
      ...r,
      likes_count: likesCount[r.id] || 0,
      liked_by_me: likedByMe.has(r.id)
    })));

  } catch (error) { res.status(500).json({ error: error.message }); }
};

const createStatus = async (req, res) => {
  const { mediaUrl, type, content } = req.body;
  const me = req.user;

  // 1. Check for Subscription/Trial
  let hasAccess = hasStandardAccess(me);

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
    const data = { user_id: me.id, media_url: mediaUrl, message_type: type, content: content || '', expires_at: expiresAt, created_at: new Date().toISOString() };
    const ref = await db.collection('statuses').add(data);
    res.json({ id: ref.id, ...data });
  } catch (error) { res.status(500).json({ error: error.message }); }
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
  try {
    const snap = await db.collection('status_likes').where('status_id', '==', statusId).get();
    const likes = await Promise.all(snap.docs.map(async doc => {
      const data = doc.data();
      const pDoc = await db.collection('profiles').doc(data.user_id).get();
      return { user_id: data.user_id, created_at: data.created_at, profile: pDoc.exists ? { id: pDoc.id, ...pDoc.data() } : null };
    }));
    const filtered = likes.filter(l => !!l.profile);
    res.json({ likes: filtered, count: filtered.length });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

module.exports = { getStatuses, createStatus, likeStatus, unlikeStatus, getStatusLikes };
