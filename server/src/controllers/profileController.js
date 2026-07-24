const { db } = require('../config/firebase');
const { isTrialActive } = require('../services/accessService');
const { getDailyUsage, incrementUsage } = require('../services/usageService');
const { QUOTAS, BOOST_SCORES } = require('../config/constants');

const updateProfile = async (req, res) => {
  const { bio, interests, relationship_goal, passport_city, passport_country, passport_latitude, passport_longitude, is_passport_active } = req.body;
  const userId = req.user.id;

  const updates = {};
  if (bio !== undefined) updates.bio = bio;
  if (interests !== undefined) updates.interests = interests;
  if (relationship_goal !== undefined) updates.relationship_goal = relationship_goal;

  if (req.user.is_premium) {
    if (passport_city !== undefined) updates.passport_city = is_passport_active ? passport_city : null;
    if (passport_country !== undefined) updates.passport_country = is_passport_active ? passport_country : null;
    if (passport_latitude !== undefined) updates.passport_latitude = is_passport_active ? passport_latitude : null;
    if (passport_longitude !== undefined) updates.passport_longitude = is_passport_active ? passport_longitude : null;
  }

  try {
    await db.collection('profiles').doc(userId).update(updates);
    const updatedDoc = await db.collection('profiles').doc(userId).get();
    res.json({ success: true, profile: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const boostProfile = async (req, res) => {
  const me = req.user;
  const duration = 3600; // 1 hour

  let canBoost = false;
  if (me.gender === 'FEMALE' && me.is_premium) {
    const u = await getDailyUsage(me.id, 'BOOST');
    if (u.usage_seconds < QUOTAS.DAILY_BOOST_SECONDS) canBoost = true;
  }

  if (!canBoost && isTrialActive(me)) {
    try {
      const usageSnap = await db.collection('daily_usage')
        .where('user_id', '==', me.id)
        .where('action_type', '==', 'BOOST')
        .get();
      const totalTrialUsage = usageSnap.docs.reduce((acc, curr) => acc + (curr.data().usage_seconds || 0), 0);
      if (totalTrialUsage < QUOTAS.TRIAL_BOOST_SECONDS) canBoost = true;
    } catch (e) {}
  }

  if (!canBoost) return res.status(403).json({ error: 'no_free_boost_available', message: 'Votre heure de boost gratuite est épuisée.' });

  const boostedUntil = new Date(Date.now() + duration * 1000).toISOString();
  try {
    await db.collection('profiles').doc(me.id).update({ boosted_until: boostedUntil, boost_score: BOOST_SCORES.FREE });
    await incrementUsage(me.id, 'BOOST', duration);
    res.json({ boosted_until: boostedUntil });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const completePartnerProfile = async (req, res) => {
  const { venueName, venueType, city, address, description, benefit, latitude, longitude } = req.body;
  const userId = req.user.id;

  try {
    const batch = db.batch();

    const profileRef = db.collection('profiles').doc(userId);
    batch.update(profileRef, { name: venueName, is_partner: true, onboarding_completed: true });

    const venueRef = db.collection('venues').doc();
    batch.set(venueRef, {
      owner_id: userId,
      name: venueName,
      venue_type: venueType,
      city,
      address,
      description,
      benefit_description: benefit,
      latitude: latitude || null,
      longitude: longitude || null,
      status: 'APPROVED',
      created_at: new Date().toISOString()
    });

    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 30);

    const subRef = db.collection('subscriptions').doc();
    batch.set(subRef, {
      user_id: userId,
      plan_id: 'PRESTIGE',
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: end.toISOString(),
      payment_method: 'TRIAL',
      created_at: now.toISOString()
    });

    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createProfile = async (req, res) => {
  const { name, age, gender } = req.body;
  const { uid, email } = req.authUser; // from middleware

  try {
    const profileRef = db.collection('profiles').doc(uid);
    const doc = await profileRef.get();

    if (doc.exists) {
      return res.status(400).json({ error: 'profile_already_exists' });
    }

    const newProfile = {
      name,
      age: parseInt(age),
      gender: String(gender).toUpperCase(),
      email,
      is_premium: false,
      is_verified: false,
      is_admin: false,
      onboarding_completed: false,
      likes_count: 0,
      roses_count: 0,
      created_at: new Date().toISOString()
    };

    await profileRef.set(newProfile);
    res.json({ success: true, profile: { id: uid, ...newProfile } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createProfile, updateProfile, boostProfile, completePartnerProfile };
