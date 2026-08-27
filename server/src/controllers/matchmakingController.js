const { db } = require('../config/firebase');
const { FieldPath, FieldValue } = require('firebase-admin/firestore');
const { calculateDistance, calculateMatchScore } = require('../services/matchmakingService');
const { normalizeCity } = require('../utils/geo');
const { getGeohashPrefixesForRadius, getGeohashRangeForPrefix } = require('../utils/geohash');
const { hasInvisiblePremiumAccessForPlan, isHiddenByInvisibleMode, hasQuarterlyLimitedInvisibleAccess, isTrialActive } = require('../services/accessService');
const { getDailyUsage, incrementUsage, hasDirectMessagePurchase } = require('../services/usageService');
const { createInternalNotification, NOTIFICATION_TYPES } = require('../services/notificationCenterService');
const { QUOTAS } = require('../config/constants');

const createNotificationSafely = (payload) => {
  void createInternalNotification(payload).catch((error) => {
    console.warn('[matchmaking] notification_failed', error.message);
  });
};

const normalizeText = (value) => String(value || '').trim().toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const normalizeGridRemaining = (value) => {
  const remaining = Number(value || 0);
  if (!Number.isFinite(remaining)) return 0;
  return Math.max(0, Math.min(QUOTAS.DISCOVER_GRID_PROFILES, Math.floor(remaining)));
};

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

const normalizeGender = (value) => String(value || '').trim().toUpperCase();

const SUPER_LIKE_STATUS_LABELS = {
  PENDING: 'En attente',
  ACCEPTED: 'Acceptee',
  IGNORED: 'Ignoree'
};

const normalizeSuperLikeStatus = (value) => {
  const status = String(value || 'PENDING').trim().toUpperCase();
  return ['PENDING', 'ACCEPTED', 'IGNORED'].includes(status) ? status : 'PENDING';
};

const normalizeGenderList = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeGender).filter(Boolean);
};

const getProfileTargetGenders = (profile) => normalizeGenderList(
  profile?.target_gender || profile?.preferences?.targetGender
);

const getCandidateAgePreference = (candidate) => ({
  min: Number(candidate?.min_age || candidate?.minAge || candidate?.preferences?.minAge || 18),
  max: Number(candidate?.max_age || candidate?.maxAge || candidate?.preferences?.maxAge || 100),
});

const acceptsAge = (age, preference) => {
  const numericAge = Number(age);
  if (!Number.isFinite(numericAge)) return true;
  const min = Number.isFinite(preference.min) ? preference.min : 18;
  const max = Number.isFinite(preference.max) ? preference.max : 100;
  return numericAge >= min && numericAge <= max;
};

const getDesiredGenders = ({ me, forcedOppositeGender, gender }) => {
  if (forcedOppositeGender) return [forcedOppositeGender];
  const explicitGender = normalizeGender(gender);
  if (explicitGender && explicitGender !== 'ALL') return [explicitGender];
  return getProfileTargetGenders(me);
};

const getDiscoveryTier = ({ candidateCity, candidateCountry, distanceKm, cityFilter, myCity, myCountry, maxDistance }) => {
  const preferredCity = cityFilter || myCity;
  if (preferredCity && candidateCity === preferredCity) return 'SAME_CITY';
  if (Number.isFinite(distanceKm) && distanceKm <= maxDistance) return 'NEARBY';
  if (myCountry && candidateCountry && candidateCountry === myCountry) return 'SAME_COUNTRY';
  return 'OPEN';
};

const selectWithLocationFallback = (rows, limit) => {
  const orderedTiers = ['SAME_CITY', 'NEARBY', 'SAME_COUNTRY', 'OPEN'];
  const selected = [];

  for (const tier of orderedTiers) {
    selected.push(...rows.filter(row => row.discovery_tier === tier));
    if (selected.length >= limit) break;
  }

  return selected;
};

const fetchProfilesByGeohash = async ({ latitude, longitude, radiusKm, maxDocs = 300 }) => {
  const prefixes = getGeohashPrefixesForRadius({ latitude, longitude, radiusKm });
  if (prefixes.length === 0) return [];

  const docsById = new Map();
  const perPrefixLimit = Math.max(20, Math.ceil(maxDocs / prefixes.length));

  for (const prefix of prefixes) {
    if (docsById.size >= maxDocs) break;
    const [start, end] = getGeohashRangeForPrefix(prefix);
    const snap = await db.collection('profiles')
      .orderBy('geohash')
      .startAt(start)
      .endAt(end)
      .limit(perPrefixLimit)
      .get();

    snap.docs.forEach(doc => {
      if (docsById.has(doc.id) || docsById.size >= maxDocs) return;
      const profile = { id: doc.id, ...doc.data() };
      const distanceKm = calculateDistance(latitude, longitude, Number(profile.latitude), Number(profile.longitude));
      if (!Number.isFinite(distanceKm) || distanceKm > radiusKm) return;
      docsById.set(doc.id, profile);
    });
  }

  return [...docsById.values()];
};

const buildBroadProfilesQuery = () => (
  db.collection('profiles')
    .where('onboarding_completed', '==', true)
);

const mergeProfilesById = (primary, fallback) => {
  const rowsById = new Map();
  primary.forEach(profile => rowsById.set(profile.id, profile));
  fallback.forEach(profile => {
    if (!rowsById.has(profile.id)) rowsById.set(profile.id, profile);
  });
  return [...rowsById.values()];
};

const encodeGridCursor = (offset) => Buffer.from(JSON.stringify({ offset }), 'utf8').toString('base64url');

const decodeGridCursor = (cursor) => {
  if (!cursor) return 0;
  try {
    const payload = JSON.parse(Buffer.from(String(cursor), 'base64url').toString('utf8'));
    const offset = Number(payload?.offset);
    return Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0;
  } catch {
    return 0;
  }
};

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
    minScore = 0,
    isGrid = 'false'
  } = req.query;

  const isGridMode = String(isGrid).toLowerCase() === 'true';
  const paginationOffset = isGridMode ? decodeGridCursor(req.query.cursor) : 0;
  const includeSelf = String(req.query.includeSelf || '').toLowerCase() === 'true';
  const meGender = String(me?.gender || '').toUpperCase();
  const meGoal = String(me?.relationship_goal || '').toUpperCase();

  const myLat = Number(me.passport_latitude || me.latitude);
  const myLon = Number(me.passport_longitude || me.longitude);
  const myCity = normalizeCity(me.passport_city || me.city);
  const myCountry = normalizeText(me.passport_country || me.country);
  let gridRemainingForResponse = null;

  // 0. Quota check for Grid
  if (isGridMode && !me.is_premium) {
    gridRemainingForResponse = normalizeGridRemaining(me.grid_consultations_remaining);
    if (gridRemainingForResponse <= 0) {
      return res.status(403).json({ error: 'grid_quota_exceeded', message: "Votre quota d'exploration est épuisé. Repassez au Swipe ou débloquez un pack." });
    }
  }

  // Logic: Serious goals see opposite gender only. Casual/Friendship see all.
  const isStrictGoal = meGoal === 'SERIOUS' || meGoal === 'MARRIAGE';
  const forcedOppositeGender =
    isStrictGoal
      ? (meGender === 'MALE' ? 'FEMALE' : meGender === 'FEMALE' ? 'MALE' : null)
      : null;

  const cityFilter = normalizeCity(city || myCity);
  const searchQuery = String(search || '').trim().toLowerCase();
  const maxDistance = Number.isFinite(parseFloat(maxDistanceKm))
    ? Math.max(1, parseFloat(maxDistanceKm))
    : null;
  const effectiveMaxDistance = maxDistance || 100;
  const safeLimit = Math.max(1, Math.min(isGridMode ? 12 : 100, parseInt(limit, 10) || (isGridMode ? 12 : 40)));
  const selectionLimit = isGridMode ? paginationOffset + safeLimit + 1 : safeLimit;
  const candidateReadTarget = isGridMode ? Math.min(500, Math.max(selectionLimit * 8, safeLimit * 8)) : safeLimit * 8;
  const desiredGenders = getDesiredGenders({ me, forcedOppositeGender, gender });

  try {
    const now = new Date().toISOString();

    // 1. Fetch Golden Roses, My positive likes, dismissed profiles, matches, and Super Likes received
    const [grSnapshot, myLikesSnapshot, myDismissedSnapshot, myMatchesSnapshot, incomingSuperLikesSnapshot] = await Promise.all([
      db.collection('golden_roses').where('expires_at', '>', now).get(),
      db.collection('likes').where('liker_id', '==', me.id).get(),
      db.collection('swipes').where('swiper_id', '==', me.id).get(),
      db.collection('matches').where('status', '==', 'ACTIVE').get(),
      db.collection('likes').where('liked_id', '==', me.id).get(),
    ]);

    const goldenRoseUserIds = new Set(grSnapshot.docs.map(doc => doc.data().user_id));
    const alreadySwipedIds = new Set(myLikesSnapshot.docs.map(doc => doc.data().liked_id));
    myDismissedSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.direction === 'LEFT') alreadySwipedIds.add(data.target_id);
    });
    const incomingSuperLikesByCandidate = new Set(
      incomingSuperLikesSnapshot.docs
        .map(doc => doc.data())
        .filter(row => row.is_super_like === true)
        .map(row => row.liker_id)
    );

    // Add existing matches to already swiped
    myMatchesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.user_one_id === me.id) alreadySwipedIds.add(data.user_two_id);
      else if (data.user_two_id === me.id) alreadySwipedIds.add(data.user_one_id);
    });

    // 2. Fetch candidates from Firestore. Prefer geohash-bounded reads when GPS is available.
    // Fallback to the broad query only when search is explicit or the geohash index is not populated enough yet.
    const canUseGeohash = Number.isFinite(myLat) && Number.isFinite(myLon) && !searchQuery;
    const broadQuery = buildBroadProfilesQuery();
    let candidates = [];

    if (canUseGeohash) {
      candidates = await fetchProfilesByGeohash({
        latitude: myLat,
        longitude: myLon,
        radiusKm: effectiveMaxDistance,
        maxDocs: candidateReadTarget
      });
    }

    if (!canUseGeohash || candidates.length < selectionLimit) {
      const snapshot = await broadQuery.limit(canUseGeohash ? candidateReadTarget : 500).get();
      const fallbackCandidates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      candidates = mergeProfilesById(candidates, fallbackCandidates);
    }

    // 3. In-memory filtering (Removes need for complex indexes)
    const minAgeNum = parseInt(minAge) || 18;
    const maxAgeNum = parseInt(maxAge) || 100;

    candidates = candidates.filter(c => {
      const candidateGender = normalizeGender(c.gender);
      const candidateTargetGenders = getProfileTargetGenders(c);
      const candidateAgePreference = getCandidateAgePreference(c);

      return c.id !== me.id &&
             c.onboarding_completed === true &&
             !c.suspended_at &&
             !alreadySwipedIds.has(c.id) &&
             (desiredGenders.length === 0 || desiredGenders.includes(candidateGender)) &&
             (candidateTargetGenders.length === 0 || candidateTargetGenders.includes(meGender)) &&
             acceptsAge(me.age, candidateAgePreference) &&
             (c.age >= minAgeNum && c.age <= maxAgeNum);
    });

    const candidateIds = candidates.map(c => c.id);
    const invisibleEligibleBySubscription = new Set();

    if (candidateIds.length > 0) {
      // Chunking for Firestore 'in' limit (30)
      for (let i = 0; i < candidateIds.length; i += 30) {
        const chunk = candidateIds.slice(i, i + 30);

        // Note: We remove current_period_end inequality to avoid index requirements (Error 500)
        // We will check the expiration date in memory below.
        const subSnapshot = await db.collection('subscriptions')
          .where('user_id', 'in', chunk)
          .get();

        subSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const isActive = data.status === 'active';
          const isExpired = data.current_period_end && new Date(data.current_period_end) < new Date();

          if (isActive && !isExpired) {
            const profile = candidates.find(c => c.id === data.user_id);
            if (profile && hasInvisiblePremiumAccessForPlan(profile, data.plan_id)) {
              invisibleEligibleBySubscription.add(data.user_id);
            }
          }
        });
      }
    }

    // 4. Suggestions filtering and location-tiering.
    const assessedSuggestions = candidates.map(c => {
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

      const candidateCityNorm = normalizeCity(c.city);
      const candidateCountryNorm = normalizeText(c.country);
      const discoveryTier = getDiscoveryTier({
        candidateCity: candidateCityNorm,
        candidateCountry: candidateCountryNorm,
        distanceKm,
        cityFilter,
        myCity,
        myCountry,
        maxDistance: effectiveMaxDistance
      });

      // Search stays explicit: when the user searches, do not constrain by location fallback.
      if (searchQuery) {
        const haystack = `${c.name || ''} ${c.bio || ''} ${c.city || ''} ${c.country || ''}`.toLowerCase();
        if (!haystack.includes(searchQuery)) return null;
      }

      const {
        score,
        compatibilityScore,
        commercialScore,
        commonInterestsCount,
      } = calculateMatchScore({
        candidate: c,
        me,
        isGoldenRose: goldenRoseUserIds.has(c.id),
        distanceKm,
        maxDistanceKm: effectiveMaxDistance,
        discoveryTier
      });

      return {
        ...toPublicProfile(c),
        score,
        compatibility_score: compatibilityScore,
        commercial_score: commercialScore,
        common_interests_count: commonInterestsCount,
        distance_km: Number.isFinite(distanceKm) ? parseFloat(distanceKm.toFixed(1)) : null,
        discovery_tier: discoveryTier,
        super_liked_me: incomingSuperLikesByCandidate.has(c.id),
        has_golden_rose: goldenRoseUserIds.has(c.id),
      };
    }).filter(Boolean);

    const suggestions = searchQuery
      ? assessedSuggestions
      : selectWithLocationFallback(assessedSuggestions, selectionLimit);

    if (includeSelf && me.boosted_until && new Date(me.boosted_until) > new Date()) {
       const selfScore = (me.is_vip ? 200 : (me.is_premium ? 50 : 0)) + 15 + 500;
       if (!suggestions.some(s => s.id === me.id)) {
         suggestions.push({ ...me, score: selfScore, distance_km: 0, super_liked_me: false, current_user: true });
       }
    }

    const rankedSuggestions = suggestions.sort((a, b) => b.score - a.score);
    const sliced = rankedSuggestions.slice(paginationOffset, paginationOffset + safeLimit);
    const nextOffset = paginationOffset + sliced.length;
    const nextCursor = isGridMode && rankedSuggestions.length > nextOffset
      ? encodeGridCursor(nextOffset)
      : null;

    const selfRank = sliced.findIndex((profile) => profile?.id === me.id) + 1;
    res.json({
      suggestions: sliced,
      current_user_rank: selfRank > 0 ? selfRank : null,
      next_cursor: nextCursor,
      grid_remaining: isGridMode && !me.is_premium ? gridRemainingForResponse : null
    });

  } catch (error) {
    console.error('getSuggestions error:', error);
    res.status(500).json({ error: error.message });
  }
};

const markGridProfilesViewed = async (req, res) => {
  const me = req.user;
  const profileIds = [...new Set((Array.isArray(req.body?.profileIds) ? req.body.profileIds : [])
    .map(id => String(id || '').trim())
    .filter(id => id && id !== me.id))]
    .slice(0, 12);

  if (!profileIds.length) {
    return res.json({
      success: true,
      consumed: 0,
      remaining: normalizeGridRemaining(me.grid_consultations_remaining)
    });
  }

  if (me.is_premium) {
    return res.json({ success: true, consumed: 0, remaining: null });
  }

  try {
    const profileRef = db.collection('profiles').doc(me.id);
    const viewRefs = profileIds.map(profileId => (
      db.collection('grid_profile_views').doc(`${me.id}_${profileId}`)
    ));

    const result = await db.runTransaction(async (transaction) => {
      const profileDoc = await transaction.get(profileRef);
      if (!profileDoc.exists) throw new Error('profile_not_found');

      const profileData = profileDoc.data();
      const rawRemaining = Math.max(0, Number(profileData.grid_consultations_remaining || 0));
      const remaining = normalizeGridRemaining(rawRemaining);
      if (remaining <= 0) return { consumed: 0, remaining: 0, exhausted: true };

      const viewDocs = await Promise.all(viewRefs.map(ref => transaction.get(ref)));
      const newViewIndexes = viewDocs
        .map((doc, index) => doc.exists ? null : index)
        .filter(index => index !== null)
        .slice(0, remaining);

      if (newViewIndexes.length === 0) {
        if (rawRemaining !== remaining) {
          transaction.update(profileRef, {
            grid_consultations_remaining: remaining,
            updated_at: new Date().toISOString()
          });
        }
        return { consumed: 0, remaining, exhausted: false };
      }

      const now = new Date().toISOString();
      newViewIndexes.forEach(index => {
        transaction.create(viewRefs[index], {
          user_id: me.id,
          profile_id: profileIds[index],
          source: 'DISCOVER_GRID',
          viewed_at: now,
          created_at: now
        });
      });
      transaction.update(profileRef, {
        grid_consultations_remaining: Math.max(0, remaining - newViewIndexes.length),
        updated_at: now
      });

      return {
        consumed: newViewIndexes.length,
        remaining: Math.max(0, remaining - newViewIndexes.length),
        exhausted: remaining - newViewIndexes.length <= 0
      };
    });

    if (result.exhausted && result.consumed === 0) {
      return res.status(403).json({ error: 'grid_quota_exceeded', remaining: 0 });
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('markGridProfilesViewed error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getVisibilityInsight = async (req, res) => {
  const me = req.user;
  const meCity = normalizeCity(me.city);
  if (!meCity) return res.json({ rank: null, total: 0, recommendation: null });

  try {
    const now = new Date().toISOString();
    // Fetch all profiles to calculate rank in memory (avoids index issues with city filter)
    const snapshot = await db.collection('profiles')
      .where('onboarding_completed', '==', true)
      .get();

    const competitors = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(c => !c.suspended_at && normalizeCity(c.city) === meCity);

    const grSnapshot = await db.collection('golden_roses').where('expires_at', '>', now).get();
    const goldenRoseUserIds = new Set(grSnapshot.docs.map(doc => doc.data().user_id));

    const scoredCompetitors = competitors.map(c => {
      const { score } = calculateMatchScore({
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

    if (direction === 'LEFT') {
      const now = new Date().toISOString();
      await db.collection('swipes').doc(`${me.id}_${safeTargetUserId}`).set({
        swiper_id: me.id,
        target_id: safeTargetUserId,
        direction: 'LEFT',
        created_at: now,
        updated_at: now
      }, { merge: true });
      return res.json({ matched: false, matchId: null, dismissed: true });
    }

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
          .limit(80).get();
        const purchasedSuperLike = pSnapshot.docs.some((doc) => {
          const item = doc.data();
          return item.interaction_type === 'SUPER_LIKE' && item.target_id === safeTargetUserId;
        });
        if (!purchasedSuperLike) return res.status(403).json({ error: 'premium_required_for_super_like' });
      }
      await incrementUsage(me.id, 'SUPER_LIKE');
    }

    // 5. Persist Like
    const likeId = `${me.id}_${safeTargetUserId}`;
    const likeRef = db.collection('likes').doc(likeId);
    const targetProfileRef = db.collection('profiles').doc(safeTargetUserId);
    const now = new Date().toISOString();
    const nextIsSuperLike = !!isSuperLike;

    await db.runTransaction(async (transaction) => {
      const existingLike = await transaction.get(likeRef);

      if (!existingLike.exists) {
        transaction.set(likeRef, {
          liker_id: me.id,
          liked_id: safeTargetUserId,
          is_super_like: nextIsSuperLike,
          status: nextIsSuperLike ? 'PENDING' : null,
          created_at: now
        });

        transaction.update(targetProfileRef, nextIsSuperLike
          ? { roses_count: FieldValue.increment(1) }
          : { likes_count: FieldValue.increment(1) }
        );
        return;
      }

      const previousIsSuperLike = !!existingLike.data()?.is_super_like;
      if (previousIsSuperLike === nextIsSuperLike) return;

      transaction.set(likeRef, {
        is_super_like: nextIsSuperLike,
        status: nextIsSuperLike ? 'PENDING' : null,
        updated_at: now
      }, { merge: true });

      transaction.update(targetProfileRef, {
        likes_count: FieldValue.increment(nextIsSuperLike ? -1 : 1),
        roses_count: FieldValue.increment(nextIsSuperLike ? 1 : -1)
      });
    });

    if (meHiddenByInvisibleMode) return res.json({ matched: false, matchId: null, invisible_like: true });

    createNotificationSafely({
      userId: safeTargetUserId,
      type: nextIsSuperLike ? NOTIFICATION_TYPES.ROSE_RECEIVED : NOTIFICATION_TYPES.LIKE_RECEIVED,
      title: nextIsSuperLike ? 'Rose recue' : 'Nouveau like',
      message: nextIsSuperLike
        ? `${me.name} vous a envoye une rose.`
        : `${me.name} aime votre profil.`,
      targetId: me.id,
      metadata: {
        liker_id: me.id,
        liker_name: me.name,
        is_super_like: nextIsSuperLike,
        like_id: likeId
      },
      dedupeKey: `${nextIsSuperLike ? 'rose' : 'like'}_${safeTargetUserId}_${me.id}`,
      sendPush: true,
      pushData: {
        likerId: me.id,
        likeId,
        type: nextIsSuperLike ? 'ROSE_RECEIVED' : 'LIKE_RECEIVED'
      }
    });

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

    createNotificationSafely({
      userId: me.id,
      type: NOTIFICATION_TYPES.MATCH_CREATED,
      title: "C'est un Match !",
      message: `Vous avez matche avec ${targetProfile.name}.`,
      targetId: matchId,
      metadata: { match_id: matchId, other_user_id: safeTargetUserId, other_user_name: targetProfile.name },
      dedupeKey: `match_${me.id}_${matchId}`,
      sendPush: true,
      pushData: { matchId, type: 'MATCH' }
    });
    createNotificationSafely({
      userId: safeTargetUserId,
      type: NOTIFICATION_TYPES.MATCH_CREATED,
      title: "C'est un Match !",
      message: `Vous avez matche avec ${me.name}.`,
      targetId: matchId,
      metadata: { match_id: matchId, other_user_id: me.id, other_user_name: me.name },
      dedupeKey: `match_${safeTargetUserId}_${matchId}`,
      sendPush: true,
      pushData: { matchId, type: 'MATCH' }
    });

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

const respondToSuperLike = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'ACCEPT' | 'IGNORE'
  const me = req.user;

  try {
    console.log(`[ROSE] User ${me.id} responding to rose ${id} with action: ${action}`);
    const likeRef = db.collection('likes').doc(id);
    const likeDoc = await likeRef.get();
    if (!likeDoc.exists) return res.status(404).json({ error: 'rose_not_found' });

    const likeData = likeDoc.data();
    if (likeData.liked_id !== me.id) return res.status(403).json({ error: 'unauthorized' });

    if (action === 'IGNORE') {
      await likeRef.update({ status: 'IGNORED' });
      return res.json({ success: true });
    }

    if (action === 'ACCEPT') {
      // 1. Update status
      await likeRef.update({ status: 'ACCEPTED' });

      // 2. Create Match
      const senderId = likeData.liker_id;
      const [userOneId, userTwoId] = [me.id, senderId].sort();
      const matchId = `${userOneId}_${userTwoId}`;
      const matchRef = db.collection('matches').doc(matchId);
      const matchDoc = await matchRef.get();

      if (!matchDoc.exists) {
        await matchRef.set({
          user_one_id: userOneId,
          user_two_id: userTwoId,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          last_message_at: new Date().toISOString()
        });

        // 3. Notify sender
        createNotificationSafely({
          userId: senderId,
          type: NOTIFICATION_TYPES.MATCH_CREATED,
          title: 'Rose acceptee !',
          message: `${me.name} a accepte votre rose. Discutez maintenant !`,
          targetId: matchId,
          metadata: { match_id: matchId, other_user_id: me.id, other_user_name: me.name, rose_id: id },
          dedupeKey: `rose_accepted_${senderId}_${id}`,
          sendPush: true,
          pushData: { matchId, type: 'MATCH' }
        });
      }

      return res.json({ success: true, matchId });
    }

    res.status(400).json({ error: 'invalid_action' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSuperLikesReceived = async (req, res) => {
  const me = req.user;
  try {
    const snapshot = await db.collection('likes')
      .where('liked_id', '==', me.id)
      .get();

    const rows = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(row => row.is_super_like === true);

    const results = await Promise.all(rows.map(async row => {
      const senderDoc = await db.collection('profiles').doc(row.liker_id).get();
      const senderProfile = senderDoc.exists ? { id: senderDoc.id, ...senderDoc.data() } : null;
      if (!senderProfile || senderProfile.suspended_at || senderProfile.onboarding_completed === false) return null;

      const status = normalizeSuperLikeStatus(row.status);
      const [userOneId, userTwoId] = [me.id, row.liker_id].sort();
      const [likedBackDoc, matchDoc, directMessagePurchased] = await Promise.all([
        db.collection('likes').doc(`${me.id}_${row.liker_id}`).get(),
        db.collection('matches').doc(`${userOneId}_${userTwoId}`).get(),
        hasDirectMessagePurchase(me.id, row.liker_id)
      ]);

      const isMatched = matchDoc.exists && matchDoc.data().status === 'ACTIVE';

      return {
        ...row,
        status,
        status_label: SUPER_LIKE_STATUS_LABELS[status],
        sender_id: row.liker_id,
        is_locked: false,
        is_countable: status === 'PENDING',
        liked_back: likedBackDoc.exists,
        is_matched: isMatched,
        matchId: isMatched ? matchDoc.id : null,
        can_message: isMatched || !!me.is_premium || String(me.gender || '').toUpperCase() === 'FEMALE' || !!directMessagePurchased,
        user: toPublicProfile(senderProfile),
        profiles: toPublicProfile(senderProfile)
      };
    }));

    res.json(results.filter(Boolean).sort((left, right) => {
      const priority = { PENDING: 0, ACCEPTED: 1, IGNORED: 2 };
      const delta = priority[left.status] - priority[right.status];
      if (delta !== 0) return delta;
      return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime();
    }));
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getLikesReceived = async (req, res) => {
  const isFemaleFreePlan = String(req.user?.gender || '').toUpperCase() === 'FEMALE' && !req.user?.is_premium;
  const isTemporarilyUnlocked = req.user?.likes_unlocked_until && new Date(req.user.likes_unlocked_until) > new Date();

  if (!req.user?.is_premium && !isTrialActive(req.user) && !isFemaleFreePlan && !isTemporarilyUnlocked) {
    return res.status(403).json({ error: 'subscription_required' });
  }

  try {
    const snapshot = await db.collection('likes')
      .where('liked_id', '==', req.user.id)
      .get();

    const rows = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(row => !row.is_super_like)
      .sort((left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime());

    const likerIds = [...new Set(rows.map(r => r.liker_id))];
    if (likerIds.length === 0) return res.json([]);

    const profiles = [];
    for (let i = 0; i < likerIds.length; i += 30) {
      const chunk = likerIds.slice(i, i + 30);
      const profileSnapshot = await db.collection('profiles').where(FieldPath.documentId(), 'in', chunk).get();
      profiles.push(...profileSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }

    const activeProfiles = profiles.filter(p => !p.suspended_at && p.onboarding_completed);

    const myMatchesSnapshot = await db.collection('matches').where('status', '==', 'ACTIVE').get();
    const matchedIds = new Set();
    myMatchesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.user_one_id === req.user.id) matchedIds.add(data.user_two_id);
      else if (data.user_two_id === req.user.id) matchedIds.add(data.user_one_id);
    });

    res.json(rows.map(row => {
      const profile = activeProfiles.find(p => p.id === row.liker_id);
      if (!profile) return null;
      return {
        id: row.id,
        liker_id: row.liker_id,
        created_at: row.created_at,
        liked_back: false,
        is_matched: matchedIds.has(row.liker_id),
        user: toPublicProfile(profile)
      };
    }).filter(Boolean));

  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getLikesQuota = async (req, res) => {
  const isFemaleFreePlan = String(req.user?.gender || '').toUpperCase() === 'FEMALE' && !req.user?.is_premium;
  const isTemporarilyUnlocked = req.user?.likes_unlocked_until && new Date(req.user.likes_unlocked_until) > new Date();
  const canAccess = !!req.user?.is_premium || isTrialActive(req.user) || isFemaleFreePlan || !!isTemporarilyUnlocked;

  res.json({
    canAccess,
    is_premium: !!req.user?.is_premium,
    trial_active: isTrialActive(req.user),
    female_free_plan: isFemaleFreePlan,
    likes_unlocked_until: req.user?.likes_unlocked_until || null
  });
};

module.exports = {
  getSuggestions, markGridProfilesViewed, getVisibilityInsight, handleSwipe, unmatch,
  getSuperLikesReceived, getLikesReceived, getLikesQuota, respondToSuperLike
};
