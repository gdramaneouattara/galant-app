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
  let score = (candidate.is_vip ? 200 : (candidate.is_premium ? 50 : 0)) + (candidate.city === me.city ? 30 : 0);

  // 1. Common Interests (High quality matching)
  const myInterests = new Set(me.interests || []);
  const candidateInterests = candidate.interests || [];
  let commonCount = 0;
  candidateInterests.forEach(interest => {
    if (myInterests.has(interest)) commonCount++;
  });
  score += (commonCount * 40);

  // 2. Relationship Goal Alignment
  if (me.relationship_goal && candidate.relationship_goal) {
    if (me.relationship_goal === candidate.relationship_goal) {
      score += 150;
    } else if (
      (me.relationship_goal === 'SERIOUS' && candidate.relationship_goal === 'MARRIAGE') ||
      (me.relationship_goal === 'MARRIAGE' && candidate.relationship_goal === 'SERIOUS')
    ) {
      score += 100;
    }
  }

  // 3. New User Boost (First 48h)
  const isNewUser = new Date(candidate.created_at) > new Date(Date.now() - 48 * 3600 * 1000);
  if (isNewUser) score += 300;

  // 4. Golden Rose Priority (Ultra High)
  if (isGoldenRose) score += 10000;

  // 5. Behavior Score (Galanterie)
  const galanterieBonus = Math.max(0, (candidate.galanterie_score || 5.0) - 3) * 25;
  score += galanterieBonus;

  // 6. Boosted Priority
  if (candidate.boosted_until && new Date(candidate.boosted_until) > new Date()) {
    score += (candidate.boost_score || 500);
  }

  // 7. Reciprocity Balance
  const candidateTargetGenders = Array.isArray(candidate.target_gender) ? candidate.target_gender : [];
  if (candidateTargetGenders.length === 0 || candidateTargetGenders.includes(me.gender)) {
    score += 50;
  }

  // 8. Random Shuffle Factor (to keep discovery fresh)
  score += Math.floor(Math.random() * 10);

  return { score, commonInterestsCount: commonCount };
};

module.exports = { calculateDistance, calculateMatchScore };
