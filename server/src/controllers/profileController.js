const { supabase } = require('../config/supabase');
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

  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, profile: data });
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
    const { data } = await supabase.from('daily_usage').select('usage_seconds').eq('user_id', me.id).eq('action_type', 'BOOST');
    const totalTrialUsage = (data || []).reduce((acc, curr) => acc + (curr.usage_seconds || 0), 0);
    if (totalTrialUsage < QUOTAS.TRIAL_BOOST_SECONDS) canBoost = true;
  }

  if (!canBoost) return res.status(403).json({ error: 'no_free_boost_available', message: 'Votre heure de boost gratuite est épuisée.' });

  const boostedUntil = new Date(Date.now() + duration * 1000).toISOString();
  const { error } = await supabase.from('profiles').update({ boosted_until: boostedUntil, boost_score: BOOST_SCORES.FREE }).eq('id', me.id);
  if (error) return res.status(500).json({ error: error.message });

  await incrementUsage(me.id, 'BOOST', duration);
  res.json({ boosted_until: boostedUntil });
};

const completePartnerProfile = async (req, res) => {
  const { venueName, venueType, city, address, description, benefit, latitude, longitude } = req.body;
  const userId = req.user.id;

  await supabase.from('profiles').update({ name: venueName, is_partner: true, onboarding_completed: true }).eq('id', userId);
  await supabase.from('venues').insert({ owner_id: userId, name: venueName, venue_type: venueType, city: city, address: address, description: description, benefit_description: benefit, latitude: latitude || null, longitude: longitude || null, status: 'APPROVED' });

  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 30);

  await supabase.from('subscriptions').insert({ user_id: userId, plan_id: 'PRESTIGE', status: 'active', current_period_start: now.toISOString(), current_period_end: end.toISOString(), payment_method: 'TRIAL' });

  res.json({ success: true });
};

module.exports = { updateProfile, boostProfile, completePartnerProfile };
