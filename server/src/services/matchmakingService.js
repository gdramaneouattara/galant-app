const { toRadians, normalizeCity } = require('../utils/geo');

const normalizeText = (value) => String(value || '').trim().toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const normalizeGender = (value) => String(value || '').trim().toUpperCase();

const normalizeList = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map(item => String(item || '').trim()).filter(Boolean);
};

const getTargetGenders = (profile) => normalizeList(profile?.target_gender || profile?.preferences?.targetGender)
  .map(normalizeGender)
  .filter(Boolean);

const getAgePreference = (profile) => ({
  min: Number(profile?.min_age || profile?.minAge || profile?.preferences?.minAge || 18),
  max: Number(profile?.max_age || profile?.maxAge || profile?.preferences?.maxAge || 100),
});

const isAgeAccepted = (age, preference) => {
  const numericAge = Number(age);
  if (!Number.isFinite(numericAge)) return true;
  const min = Number.isFinite(preference.min) ? preference.min : 18;
  const max = Number.isFinite(preference.max) ? preference.max : 100;
  return numericAge >= min && numericAge <= max;
};

const getGoalCompatibility = (goalA, goalB) => {
  const a = String(goalA || '').toUpperCase();
  const b = String(goalB || '').toUpperCase();
  if (!a || !b) return 25;
  if (a === b) return 180;
  const durable = new Set(['SERIOUS', 'MARRIAGE']);
  const social = new Set(['CASUAL', 'FRIENDSHIP', 'NETWORKING']);
  if (durable.has(a) && durable.has(b)) return 125;
  if (social.has(a) && social.has(b)) return 80;
  return -70;
};

const getStableDailyJitter = (meId, candidateId) => {
  const dayKey = new Date().toISOString().slice(0, 10);
  const input = `${meId || ''}:${candidateId || ''}:${dayKey}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash % 10);
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (![lat1, lon1, lat2, lon2].every(value => Number.isFinite(Number(value)))) return null;
  const R = 6371; // Earth radius in km
  const dLat = toRadians(Number(lat2) - Number(lat1));
  const dLon = toRadians(Number(lon2) - Number(lon1));
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(Number(lat1))) * Math.cos(toRadians(Number(lat2))) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const calculateMatchScore = ({
  candidate,
  me,
  isGoldenRose,
  distanceKm = null,
  maxDistanceKm = null,
  discoveryTier = 'OPEN',
}) => {
  const meCity = normalizeCity(me.passport_city || me.city);
  const candCity = normalizeCity(candidate.city);
  const meCountry = normalizeText(me.passport_country || me.country);
  const candCountry = normalizeText(candidate.country);
  const meGender = normalizeGender(me.gender);
  const candidateGender = normalizeGender(candidate.gender);
  const meTargetGenders = getTargetGenders(me);
  const candidateTargetGenders = getTargetGenders(candidate);
  const meAcceptsCandidate = meTargetGenders.length === 0 || meTargetGenders.includes(candidateGender);
  const candidateAcceptsMe = candidateTargetGenders.length === 0 || candidateTargetGenders.includes(meGender);

  let compatibilityScore = 0;

  // 1. Bidirectional preference fit
  if (meAcceptsCandidate && candidateAcceptsMe) compatibilityScore += 220;
  else if (meAcceptsCandidate || candidateAcceptsMe) compatibilityScore += 40;
  else compatibilityScore -= 600;

  const meAgePref = getAgePreference(me);
  const candidateAgePref = getAgePreference(candidate);
  if (isAgeAccepted(candidate.age, meAgePref)) compatibilityScore += 80;
  if (isAgeAccepted(me.age, candidateAgePref)) compatibilityScore += 70;

  // 2. Common interests, with a small ratio bonus to avoid favoring long lists only.
  const myInterests = new Set(normalizeList(me.interests).map(normalizeText));
  const candidateInterests = normalizeList(candidate.interests);
  let commonCount = 0;
  candidateInterests.forEach(interest => {
    if (myInterests.has(normalizeText(interest))) commonCount++;
  });
  const interestUniverse = new Set([...myInterests, ...candidateInterests.map(normalizeText)]).size || 1;
  compatibilityScore += (commonCount * 45) + Math.round((commonCount / interestUniverse) * 60);

  // 3. Relationship goal alignment
  compatibilityScore += getGoalCompatibility(me.relationship_goal, candidate.relationship_goal);

  // 4. Locality and distance fit
  if (meCity && candCity && meCity === candCity) compatibilityScore += 190;
  if (Number.isFinite(distanceKm)) {
    const maxDistance = Number.isFinite(Number(maxDistanceKm)) ? Number(maxDistanceKm) : 100;
    if (distanceKm <= maxDistance) {
      compatibilityScore += Math.max(60, Math.round(170 - (distanceKm / Math.max(1, maxDistance)) * 90));
    } else if (distanceKm <= maxDistance * 2) {
      compatibilityScore += 45;
    }
  }
  if (meCountry && candCountry && meCountry === candCountry) compatibilityScore += 60;

  const tierBonus = {
    SAME_CITY: 120,
    NEARBY: 80,
    SAME_COUNTRY: 35,
    OPEN: 0,
  };
  compatibilityScore += tierBonus[discoveryTier] || 0;

  // 5. Behavior score
  compatibilityScore += Math.max(0, (candidate.galanterie_score || 5.0) - 3) * 25;

  // 6. New user discovery help, kept below core compatibility.
  const isNewUser = new Date(candidate.created_at) > new Date(Date.now() - 48 * 3600 * 1000);
  if (isNewUser) compatibilityScore += 90;

  let commercialScore = 0;
  if (candidate.is_vip) commercialScore += 200;
  else if (candidate.is_premium) commercialScore += 50;

  if (candidate.boosted_until && new Date(candidate.boosted_until) > new Date()) {
    commercialScore += (candidate.boost_score || 500);
  }

  if (isGoldenRose) {
    commercialScore += 10000;
  }

  const score = compatibilityScore + commercialScore + getStableDailyJitter(me.id, candidate.id);

  return {
    score,
    compatibilityScore,
    commercialScore,
    commonInterestsCount: commonCount,
    meAcceptsCandidate,
    candidateAcceptsMe,
  };
};

module.exports = { calculateDistance, calculateMatchScore };
