const { db } = require('../config/firebase');
const { isTrialActive } = require('../services/accessService');
const { getDailyUsage, incrementUsage } = require('../services/usageService');
const { QUOTAS, BOOST_SCORES, PHOTO_LIMITS } = require('../config/constants');
const { buildProfileGeohashUpdate } = require('../utils/geohash');

const RELIGION_VALUES = new Set(['CHRISTIAN', 'MUSLIM', 'OTHER']);

const normalizeReligion = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  return RELIGION_VALUES.has(normalized) ? normalized : null;
};

const normalizeReligionOther = (religion, value) => {
  if (religion !== 'OTHER') return null;
  const text = String(value || '').trim();
  return text ? text.slice(0, 80) : null;
};

const updateProfile = async (req, res) => {
  const {
    bio, interests, relationship_goal, religion, religion_other, photos, photo_variants,
    city, country, latitude, longitude,
    passport_city, passport_country, passport_latitude, passport_longitude, is_passport_active,
    radiance_score, onboarding_completed, emergency_contacts
  } = req.body;
  const userId = req.user.id;
  const maxPhotos = (req.user.is_premium || req.user.is_vip) ? PHOTO_LIMITS.PREMIUM : PHOTO_LIMITS.FREE;

  const updates = {};
  if (bio !== undefined) updates.bio = bio;
  if (interests !== undefined) updates.interests = interests;
  if (relationship_goal !== undefined) updates.relationship_goal = relationship_goal;
  if (religion !== undefined) {
    const normalizedReligion = normalizeReligion(religion);
    updates.religion = normalizedReligion;
    updates.religion_other = normalizeReligionOther(normalizedReligion, religion_other);
  } else if (religion_other !== undefined) {
    updates.religion_other = normalizeReligionOther(req.user.religion, religion_other);
  }
  if (photos !== undefined) {
    const limitedPhotos = Array.isArray(photos) ? photos.slice(0, maxPhotos) : [];
    updates.photos = limitedPhotos;
    if (photo_variants !== undefined) {
      updates.photo_variants = limitedPhotos.reduce((acc, photoUrl) => {
        const variants = photo_variants?.[photoUrl];
        if (variants && typeof variants === 'object') {
          acc[photoUrl] = {
            full: variants.full || photoUrl,
            medium: variants.medium || photoUrl,
            thumb: variants.thumb || variants.medium || photoUrl,
          };
        }
        return acc;
      }, {});
    }
  }
  if (city !== undefined) updates.city = city;
  if (country !== undefined) updates.country = country;
  if (latitude !== undefined) updates.latitude = latitude;
  if (longitude !== undefined) updates.longitude = longitude;
  if (radiance_score !== undefined) updates.radiance_score = radiance_score;
  if (onboarding_completed !== undefined) updates.onboarding_completed = onboarding_completed;
  if (emergency_contacts !== undefined) updates.emergency_contacts = Array.isArray(emergency_contacts) ? emergency_contacts.slice(0, 2) : [];
  updates.updated_at = new Date().toISOString();

  if (latitude !== undefined || longitude !== undefined) {
    Object.assign(
      updates,
      buildProfileGeohashUpdate(
        latitude !== undefined ? latitude : req.user.latitude,
        longitude !== undefined ? longitude : req.user.longitude
      )
    );
  }


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
        .get();
      const totalTrialUsage = usageSnap.docs
        .map(doc => doc.data())
        .filter(item => item.action_type === 'BOOST')
        .reduce((acc, curr) => acc + (curr.usage_seconds || 0), 0);
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
      rose_balance: 0,
      created_at: new Date().toISOString()
    };

    await profileRef.set(newProfile);
    res.json({ success: true, profile: { id: uid, ...newProfile } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const completeOnboarding = async (req, res) => {
  const {
    name, age, gender, bio, interests, relationship_goal, religion, religion_other,
    city, country, latitude, longitude, photos, photo_variants, radiance_score
  } = req.body;
  const userId = req.authUser.uid;

  try {
    const existingProfile = await db.collection('profiles').doc(userId).get();
    const existingData = existingProfile.exists ? existingProfile.data() : {};
    const maxPhotos = (existingData?.is_premium || existingData?.is_vip) ? PHOTO_LIMITS.PREMIUM : PHOTO_LIMITS.FREE;
    const limitedPhotos = Array.isArray(photos) ? photos.slice(0, maxPhotos) : [];
    const limitedPhotoVariants = limitedPhotos.reduce((acc, photoUrl) => {
      const variants = photo_variants?.[photoUrl];
      if (variants && typeof variants === 'object') {
        acc[photoUrl] = {
          full: variants.full || photoUrl,
          medium: variants.medium || photoUrl,
          thumb: variants.thumb || variants.medium || photoUrl,
        };
      }
      return acc;
    }, {});
    const normalizedReligion = normalizeReligion(religion);
    const profileRef = db.collection('profiles').doc(userId);
    const updates = {
      name,
      age: parseInt(age),
      gender: String(gender).toUpperCase(),
      bio,
      interests: Array.isArray(interests) ? interests : [],
      relationship_goal,
      religion: normalizedReligion,
      religion_other: normalizeReligionOther(normalizedReligion, religion_other),
      city,
      country,
      latitude,
      longitude,
      ...buildProfileGeohashUpdate(latitude, longitude),
      photos: limitedPhotos,
      photo_variants: limitedPhotoVariants,
      radiance_score,
      onboarding_completed: true,
      updated_at: new Date().toISOString()
    };


    await profileRef.set(updates, { merge: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createProfile, updateProfile, boostProfile, completePartnerProfile, completeOnboarding };
