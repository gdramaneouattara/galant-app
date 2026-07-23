const { db, admin } = require('../config/firebase');
const { calculateDistance, calculateMatchScore } = require('../services/matchmakingService');
const { hasInvisiblePremiumAccessForPlan, isHiddenByInvisibleMode, hasQuarterlyLimitedInvisibleAccess, isTrialActive } = require('../services/accessService');
const { getDailyUsage, incrementUsage } = require('../services/usageService');
const { sendPushNotification } = require('../services/notificationService');
const { QUOTAS } = require('../config/constants');

const getSuggestions = async (req, res) => {
  const me = req.user;
  const {
    limit = 40,
    minAge = 18,
    maxAge = 100,
    gender,
    city = '',
    maxDistanceKm,
    search = '',
    premiumOnly = 'false',
    verifiedOnly = 'false',
    minScore = 0
  } = req.query;

  const includeSelf = String(req.query.includeSelf || '').toLowerCase() === 'true';
  const meGender = String(me?.gender || '').toUpperCase();
  const meGoal = String(me?.relationship_goal || '').toUpperCase();

  const myLat = Number(me.passport_latitude || me.latitude);
  const myLon = Number(me.passport_longitude || me.longitude);
  const myCity = String(me.passport_city || me.city || '').trim().toLowerCase();

  const oppositeGenderForSerious =
    meGoal === 'SERIOUS'
      ? (meGender === 'MALE' ? 'FEMALE' : meGender === 'FEMALE' ? 'MALE' : null)
      : null;
  const cityFilter = (city || myCity).trim().toLowerCase();
  const searchQuery = String(search || '').trim().toLowerCase();
  const maxDistance = Number.isFinite(parseFloat(maxDistanceKm))
    ? Math.max(1, parseFloat(maxDistanceKm))
    : null;

  try {
    const now = new Date().toISOString();

    // 1. Fetch Golden Roses, My Likes (swipes), My Matches, and Super Likes received
    const [grSnapshot, myLikesSnapshot, myMatchesSnapshot, incomingSuperLikesSnapshot] = await Promise.all([
      db.collection('golden_roses').where('expires_at', '>', now).get(),
      db.collection('likes').where('liker_id', '==', me.id).get(),
      db.collection('matches').where('status', '==', 'ACTIVE').get(),
      db.collection('likes').where('liked_id', '==', me.id).where('is_super_like', '==', true).get(),
    ]);

    const goldenRoseUserIds = new Set(grSnapshot.docs.map(doc => doc.data().user_id));
    const alreadySwipedIds = new Set(myLikesSnapshot.docs.map(doc => doc.data().liked_id));
    const incomingSuperLikesByCandidate = new Set(incomingSuperLikesSnapshot.docs.map(doc => doc.data().liker_id));

    // Add existing matches to already swiped
    myMatchesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.user_one_id === me.id) alreadySwipedIds.add(data.user_two_id);
      else if (data.user_two_id === me.id) alreadySwipedIds.add(data.user_one_id);
    });

    // 2. Fetch candidates from Firestore
    let query = db.collection('profiles')
      .where('onboarding_completed', '==', true)
      .where('age', '>=', parseInt(minAge))
      .where('age', '<=', parseInt(maxAge));

    if (oppositeGenderForSerious) {
      query = query.where('gender', '==', oppositeGenderForSerious);
    } else if (gender && gender !== 'ALL') {
      query = query.where('gender', '==', gender);
    }

    const snapshot = await query.get();
    let candidates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Remove self, suspended, and ALREADY SWIPED
    candidates = candidates.filter(c => c.id !== me.id && !c.suspended_at && !alreadySwipedIds.has(c.id));

    const candidateIds = candidates.map(c => c.id);
    const invisibleEligibleBySubscription = new Set();

    if (candidateIds.length > 0) {
      // Chunking for Firestore 'in' limit (30)
      for (let i = 0; i < candidateIds.length; i += 30) {
        const chunk = candidateIds.slice(i, i + 30);
        const subSnapshot = await db.collection('subscriptions')
          .where('user_id', 'in', chunk)
          .where('status', '==', 'active')
          .where('current_period_end', '>', now)
          .get();

        subSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const profile = candidates.find(c => c.id === data.user_id);
          if (hasInvisiblePremiumAccessForPlan(profile, data.plan_id)) {
            invisibleEligibleBySubscription.add(data.user_id);
          }
        });
      }
    }

    // 4. Suggestions Filtering (Invisible + Premium/Verified/Standing)
    const suggestions = candidates.map(c => {
      // Filter by Invisible Mode
      const hiddenByInvisible = isHiddenByInvisibleMode(
        c,
        invisibleEligibleBySubscription.has(c.id)
      );
      if (hiddenByInvisible) return null;

      // PREMIUM PRIVILEGE: High Standing Filters
      if (premiumOnly === 'true' && !c.is_premium) return null;
      if (verifiedOnly === 'true' && !c.is_verified) return null;
      if (Number(minScore) > 0 && (c.galanterie_score || 5.0) < Number(minScore)) return null;

      const distanceKm = calculateDistance(
        myLat,
        myLon,
        Number(c.latitude),
        Number(c.longitude)
      );

      // In-memory filters for city/distance/search
      if (searchQuery) {
        const haystack = `${c.name || ''} ${c.bio || ''} ${c.city || ''} ${c.country || ''}`.toLowerCase();
        if (!haystack.includes(searchQuery)) return null;
      } else {
        if (cityFilter) {
          const candidateCity = String(c.city || '').trim().toLowerCase();
          if (candidateCity !== cityFilter) return null;
        }
        if (maxDistance !== null) {
          if (distanceKm === null || distanceKm > maxDistance) return null;
        }
      }

      const { score, commonInterestsCount } = calculateMatchScore({
        candidate: c,
        me,
        isGoldenRose: goldenRoseUserIds.has(c.id)
      });

      return {
        ...c,
        score,
        common_interests_count: commonInterestsCount,
        distance_km: distanceKm ? parseFloat(distanceKm.toFixed(1)) : null,
        super_liked_me: incomingSuperLikesByCandidate.has(c.id),
        has_golden_rose: goldenRoseUserIds.has(c.id),
      };
    }).filter(Boolean);

    if (includeSelf && me.boosted_until && new Date(me.boosted_until) > new Date()) {
       const selfScore = (me.is_vip ? 200 : (me.is_premium ? 50 : 0)) + 15 + 500;
       if (!suggestions.some(s => s.id === me.id)) {
         suggestions.push({ ...me, score: selfScore, distance_km: 0, super_liked_me: false, current_user: true });
       }
    }

    const rankedSuggestions = suggestions.sort((a, b) => b.score - a.score);
    const selfRank = rankedSuggestions.findIndex((profile) => profile?.id === me.id) + 1;
    const safeLimit = parseInt(limit) || 40;

    res.json({
      suggestions: rankedSuggestions.slice(0, safeLimit),
      current_user_rank: selfRank > 0 ? selfRank : null
    });

  } catch (error) {
    console.error('getSuggestions error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getVisibilityInsight = async (req, res) => {
  const me = req.user;
  const meCity = me.city;
  if (!meCity) return res.json({ rank: null, total: 0, recommendation: null });

  try {
    const now = new Date().toISOString();
    const snapshot = await db.collection('profiles')
      .where('city', '==', meCity)
      .where('onboarding_completed', '==', true)
      .get();

    const competitors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(c => !c.suspended_at);

    const grSnapshot = await db.collection('golden_roses').where('expires_at', '>', now).get();
    const goldenRoseUserIds = new Set(grSnapshot.docs.map(doc => doc.data().user_id));

    const scoredCompetitors = competitors.map(c => {
      const score = calculateMatchScore({
        candidate: c,
        me,
        isGoldenRose: goldenRoseUserIds.has(c.id)
      });
      return { id: c.id, score };
    });

    const ranked = scoredCompetitors.sort((a, b) => b.score - a.score);
    const myRank = ranked.findIndex(c => c.id === me.id) + 1;
    const totalInCity = ranked.length;

    let recommendation = null;
    const hasGoldenRose = goldenRoseUserIds.has(me.id);

    if (hasGoldenRose) {
      recommendation = {
        title: "L'Icône de Galant ✨",
        text: "Vous occupez la première place. Votre élégance rayonne sur toute la ville. Profitez de ce moment privilégié de visibilité totale.",
        action: null
      };
    } else if (myRank > 15) {
       recommendation = {
          title: "Propulsez votre Élégance 🚀",
          text: `Vous êtes actuellement au rang ${myRank} sur ${totalInCity} à ${meCity}. Activez une Rose d'Or pour devenir instantanément l'icône numéro 1 de votre ville pendant 3 heures.`,
          action: 'BUY_GOLDEN_ROSE'
       };
    } else {
       recommendation = {
          title: "Brillez encore plus 💎",
          text: `Belle visibilité ! Vous êtes au rang ${myRank} sur ${totalInCity}. Une Rose d'Or vous garantirait la première place absolue.`,
          action: 'BUY_GOLDEN_ROSE'
       };
    }

    res.json({ rank: myRank, total: totalInCity, recommendation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const handleSwipe = async (req, res) => {
  const { targetUserId, direction, isSuperLike } = req.body;
  const me = req.user;
  const safeTargetUserId = String(targetUserId || '').trim();

  if (!safeTargetUserId || safeTargetUserId === String(me.id)) {
    return res.status(400).json({ error: 'invalid_target' });
  }

  try {
    // 1. Get target profile
    const targetDoc = await db.collection('profiles').doc(safeTargetUserId).get();
    if (!targetDoc.exists) return res.status(404).json({ error: 'target_not_found' });
    const targetProfile = { id: targetDoc.id, ...targetDoc.data() };
    if (targetProfile.suspended_at) return res.status(404).json({ error: 'target_not_found' });

    if (direction === 'LEFT') return res.json({ matched: false, matchId: null });

    // 2. Invisible Mode check
    const meHasInvisiblePremiumAccess = hasInvisiblePremiumAccessForPlan(me, req.subscription?.plan_id);
    const meHasQuarterlyLimitedInvisible = hasQuarterlyLimitedInvisibleAccess(me, req.subscription?.plan_id);
    let meQuarterlyInvisibleStealthAvailable = false;
    if (meHasQuarterlyLimitedInvisible) {
      const usage = await getDailyUsage(me.id, 'INVISIBLE_VIEW');
      meQuarterlyInvisibleStealthAvailable = usage.usage_count < QUOTAS.MEN_3M_INVISIBLE_VIEWS;
      await incrementUsage(me.id, 'INVISIBLE_VIEW');
    }
    const meHiddenByInvisibleMode = isHiddenByInvisibleMode(me, meHasInvisiblePremiumAccess) || meQuarterlyInvisibleStealthAvailable;

    // 3. Quota check for free males
    if (me.gender === 'MALE' && !me.is_premium) {
      const usage = await getDailyUsage(me.id, 'SWIPE');
      let allowedSwipes = QUOTAS.FREE_MALE_DAILY_SWIPES;
      if ((me.galanterie_score || 0) >= QUOTAS.GALANTERIE_THRESHOLD) allowedSwipes += QUOTAS.GALANTERIE_BONUS_SWIPES;
      if (usage.usage_count >= allowedSwipes) return res.status(403).json({ error: 'quota_exceeded', message: "Limite quotidienne atteinte. Revenez demain ou passez Premium !" });
      await incrementUsage(me.id, 'SWIPE');
    }

    // 4. Super Like check
    if (isSuperLike) {
      let free = false;
      if (me.gender === 'FEMALE' && me.is_premium) {
        const u = await getDailyUsage(me.id, 'SUPER_LIKE');
        if (u.usage_count < QUOTAS.WOMEN_SUPER_LIKE) free = true;
      }
      if (!free) {
        const pSnapshot = await db.collection('purchased_interactions')
          .where('user_id', '==', me.id)
          .where('interaction_type', '==', 'SUPER_LIKE')
          .where('target_id', '==', safeTargetUserId)
          .limit(1).get();
        if (pSnapshot.empty) return res.status(403).json({ error: 'premium_required_for_super_like' });
      }
      await incrementUsage(me.id, 'SUPER_LIKE');
    }

    // 5. Persist Like
    const likeId = `${me.id}_${safeTargetUserId}`;
    await db.collection('likes').doc(likeId).set({
      liker_id: me.id,
      liked_id: safeTargetUserId,
      is_super_like: !!isSuperLike,
      created_at: new Date().toISOString()
    });

    if (meHiddenByInvisibleMode) return res.json({ matched: false, matchId: null, invisible_like: true });

    // 6. Check Reciprocal
    const reciprocalId = `${safeTargetUserId}_${me.id}`;
    const reciprocalLike = await db.collection('likes').doc(reciprocalId).get();

    if (!reciprocalLike.exists) return res.json({ matched: false, matchId: null });

    // 7. Handle Match
    const [userOneId, userTwoId] = [me.id, safeTargetUserId].sort();
    const matchId = `${userOneId}_${userTwoId}`;
    const matchRef = db.collection('matches').doc(matchId);
    const matchDoc = await matchRef.get();

    if (matchDoc.exists) return res.json({ matched: true, matchId: matchDoc.id });

    await matchRef.set({
      user_one_id: userOneId,
      user_two_id: userTwoId,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      last_message_at: new Date().toISOString()
    });

    void sendPushNotification(me.id, "C'est un Match ! 🎉", `Vous avez matché avec ${targetProfile.name}.`, { matchId, type: 'MATCH' });
    void sendPushNotification(safeTargetUserId, "C'est un Match ! 🎉", `Vous avez matché avec ${me.name}.`, { matchId, type: 'MATCH' });

    return res.json({ matched: true, matchId });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const unmatch = async (req, res) => {
  const { matchId } = req.params;
  const meId = req.user.id;
  try {
    const matchRef = db.collection('matches').doc(matchId);
    const match = await matchRef.get();
    if (!match.exists) return res.status(404).json({ error: 'match_not_found' });
    const data = match.data();
    if (data.user_one_id !== meId && data.user_two_id !== meId) return res.status(403).json({ error: 'unauthorized' });

    await matchRef.update({ status: 'UNMATCHED' });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getSuperLikesReceived = async (req, res) => {
  const me = req.user;
  try {
    const snapshot = await db.collection('likes')
      .where('liked_id', '==', me.id)
      .where('is_super_like', '==', true)
      .orderBy('created_at', 'desc')
      .get();

    const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const unlocksSnapshot = await db.collection('purchased_interactions')
      .where('user_id', '==', me.id)
      .where('interaction_type', '==', 'ROSE_NOTE_UNLOCK')
      .get();
    const unlockedSenderIds = new Set(unlocksSnapshot.docs.map(d => d.data().target_id));

    const results = await Promise.all(rows.map(async row => {
      const senderDoc = await db.collection('profiles').doc(row.liker_id).get();
      const senderProfile = senderDoc.exists ? { id: senderDoc.id, ...senderDoc.data() } : null;
      const isLocked = me.gender === 'MALE' && !me.is_premium && !unlockedSenderIds.has(row.liker_id);

      return {
        ...row,
        sender_id: row.liker_id,
        is_locked: isLocked,
        user: isLocked ? {
          ...senderProfile,
          photos: senderProfile?.photos?.map(() => 'BLURRED_PLACEHOLDER') || [],
          name: 'Élégante Galante'
        } : senderProfile
      };
    }));

    res.json(results);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getLikesReceived = async (req, res) => {
  const isFemaleFreePlan = String(req.user?.gender || '').toUpperCase() === 'FEMALE' && !req.user?.is_premium;
  if (!req.user?.is_premium && !isTrialActive(req.user) && !isFemaleFreePlan) return res.status(403).json({ error: 'subscription_required' });

  try {
    const snapshot = await db.collection('likes')
      .where('liked_id', '==', req.user.id)
      .where('is_super_like', '==', false)
      .orderBy('created_at', 'desc')
      .get();

    const rows = snapshot.docs.map(doc => doc.data());
    const likerIds = [...new Set(rows.map(r => r.liker_id))];
    if (likerIds.length === 0) return res.json([]);

    const profileSnapshot = await db.collection('profiles').where(admin.firestore.FieldPath.documentId(), 'in', likerIds.slice(0, 30)).get();
    const profiles = profileSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(p => !p.suspended_at && p.onboarding_completed);

    const myMatchesSnapshot = await db.collection('matches').where('status', '==', 'ACTIVE').get();
    const matchedIds = new Set();
    myMatchesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.user_one_id === req.user.id) matchedIds.add(data.user_two_id);
      else if (data.user_two_id === req.user.id) matchedIds.add(data.user_one_id);
    });

    res.json(rows.map(row => {
      const profile = profiles.find(p => p.id === row.liker_id);
      if (!profile) return null;
      return { liker_id: row.liker_id, created_at: row.created_at, is_matched: matchedIds.has(row.liker_id), user: profile };
    }).filter(Boolean));

  } catch (error) { res.status(500).json({ error: error.message }); }
};

module.exports = {
  getSuggestions, getVisibilityInsight, handleSwipe, unmatch,
  getSuperLikesReceived, getLikesReceived
};
