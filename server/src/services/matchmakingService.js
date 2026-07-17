const { toRadians } = require('../utils/geo');

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const calculateMatchScore = ({ candidate, me, isGoldenRose }) => {
  let score = (candidate.is_vip ? 200 : (candidate.is_premium ? 50 : 0)) + (candidate.city === me.city ? 15 : 0);

  // 1. New User Boost (First 48h)
  const isNewUser = new Date(candidate.created_at) > new Date(Date.now() - 48 * 3600 * 1000);
  if (isNewUser) score += 300;

  // 2. Golden Rose Priority (Ultra High)
  if (isGoldenRose) score += 10000;

  // 3. Behavior Score (Galanterie)
  const galanterieBonus = Math.max(0, (candidate.galanterie_score || 5.0) - 3) * 20;
  score += galanterieBonus;

  // 4. Boosted Priority
  if (candidate.boosted_until && new Date(candidate.boosted_until) > new Date()) {
    score += (candidate.boost_score || 500);
  }

  // 5. Reciprocity Balance
  const candidateTargetGenders = Array.isArray(candidate.target_gender) ? candidate.target_gender : [];
  if (candidateTargetGenders.length === 0 || candidateTargetGenders.includes(me.gender)) {
    score += 50;
  }

  return score;
};

module.exports = { calculateDistance, calculateMatchScore };
