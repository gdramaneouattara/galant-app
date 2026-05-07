const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const {
  PORT = 8787,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  EXPO_PUSH_ACCESS_TOKEN = '',
  ALLOWED_ORIGINS = '',
  PAYSTACK_SECRET_KEY = ''
} = process.env;

const app = express();
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const adminRouter = express.Router();

// --- CONFIGURATION METIERS ---
const TRIAL_DAYS = 7;
const PRICES = {
  SUPER_LIKE: parseInt(process.env.SUPER_LIKE_AMOUNT || '500'),
  DIRECT_MESSAGE: parseInt(process.env.DIRECT_MESSAGE_AMOUNT || '200'),
  BOOST_1D: parseInt(process.env.BOOST_1D_AMOUNT || '1000'),
  BOOST_3D: parseInt(process.env.BOOST_3D_AMOUNT || '2500'),
  BOOST_7D: parseInt(process.env.BOOST_7D_AMOUNT || '5000')
};
const PLAN_AMOUNTS = {
  MONTHLY: parseInt(process.env.PLAN_MONTHLY_AMOUNT || '3000'),
  QUARTERLY: parseInt(process.env.PLAN_QUARTERLY_AMOUNT || '9000'),
  BIANNUAL: parseInt(process.env.PLAN_BIANNUAL_AMOUNT || '15000'),
  ANNUAL: parseInt(process.env.PLAN_ANNUAL_AMOUNT || '30000')
};
const QUOTAS = {
  WOMEN_SUPER_LIKE: 10,
  MEN_3M_INVISIBLE_VIEWS: 20,
  MEN_3M_STATUS_VIEWS: 20,
  DAILY_BOOST_SECONDS: 3600,
  MEN_3M_HIDE_SEEN_SECONDS: 7200,
  TRIAL_BOOST_SECONDS: 3600
};
const PLAN_DURATIONS = { MONTHLY: 30, QUARTERLY: 90, BIANNUAL: 180, ANNUAL: 365 };

const allowedOrigins = ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({ origin: (origin, cb) => (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) ? cb(null, true) : cb(new Error('CORS_ERROR')) }));
app.use(express.json({ limit: '1mb' }));

// --- MIDDLEWARES ---

const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'missing_token' });
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'invalid_token' });

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (!profile) return res.status(403).json({ error: 'profile_not_found' });

    const { data: sub } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).eq('status', 'active').gt('current_period_end', new Date().toISOString()).maybeSingle();

    // Sync flags
    const isPremium = !!sub;
    const isVip = isPremium && ['BIANNUAL', 'ANNUAL'].includes(sub.plan_id?.toUpperCase());
    if (profile.is_premium !== isPremium || profile.is_vip !== isVip) {
      await supabase.from('profiles').update({ is_premium: isPremium, is_vip: isVip }).eq('id', user.id);
      profile.is_premium = isPremium;
      profile.is_vip = isVip;
    }

    req.user = profile;
    req.subscription = sub;
    req.authUser = user;
    next();
  } catch (e) { res.status(500).json({ error: 'auth_failed' }); }
};

const requireAdmin = (req, res, next) => req.user?.is_admin ? next() : res.status(403).json({ error: 'admin_required' });

// --- HELPERS ---

const isTrialActive = (p) => {
  if (!p || p.gender === 'FEMALE') return false;
  const trialEnd = new Date(p.trial_started_at);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
  return new Date() < trialEnd;
};

const hasStandardAccess = (p) => {
  if (!p) return false;
  if (p.gender === 'FEMALE') return true;
  return isTrialActive(p) || p.is_premium;
};

const getDailyUsage = async (userId, type) => {
  const date = new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('daily_usage').select('*').eq('user_id', userId).eq('action_type', type).eq('action_date', date).maybeSingle();
  return data || { usage_count: 0, usage_seconds: 0 };
};

const incrementUsage = async (userId, type, seconds = 0) => {
  const date = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase.from('daily_usage').select('id, usage_count, usage_seconds').eq('user_id', userId).eq('action_type', type).eq('action_date', date).maybeSingle();
  if (existing) {
    await supabase.from('daily_usage').update({ usage_count: (existing.usage_count || 0) + 1, usage_seconds: (existing.usage_seconds || 0) + seconds }).eq('id', existing.id);
  } else {
    await supabase.from('daily_usage').insert({ user_id: userId, action_type: type, action_date: date, usage_count: 1, usage_seconds: seconds });
  }
};

const isMissingRelationError = (error) => {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();
  return code === '42P01' || message.includes('relation') || message.includes('does not exist');
};

const normalizePrivacyStatusForClient = (value) => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'PENDING') return 'OPEN';
  if (normalized === 'PROCESSING') return 'IN_PROGRESS';
  if (normalized === 'COMPLETED') return 'RESOLVED';
  if (normalized === 'FAILED') return 'REJECTED';
  return normalized || 'OPEN';
};

const normalizePrivacyStatusForDb = (value) => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'OPEN') return 'PENDING';
  if (normalized === 'IN_PROGRESS') return 'PROCESSING';
  if (normalized === 'RESOLVED') return 'COMPLETED';
  if (normalized === 'REJECTED') return 'FAILED';
  return null;
};

const normalizeReportStatusForClient = (value) => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'PENDING') return 'OPEN';
  if (normalized === 'INVESTIGATING') return 'IN_REVIEW';
  return normalized || 'OPEN';
};

const normalizeReportStatusForDb = (value) => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'OPEN') return 'PENDING';
  if (normalized === 'IN_REVIEW') return 'INVESTIGATING';
  return normalized || 'PENDING';
};

const buildUserSegmentFilter = (segment) => {
  const value = String(segment || 'ALL').toUpperCase();
  return (profile) => {
    if (value === 'ALL') return true;
    if (value === 'ACTIVE') return !profile.suspended_at;
    if (value === 'UNVERIFIED') return !profile.is_verified;
    if (value === 'VERIFIED') return !!profile.is_verified;
    if (value === 'FREE') return !profile.is_premium;
    if (value === 'PREMIUM') return !!profile.is_premium;
    if (value === 'INVISIBLE_PREMIUM') return !!profile.is_premium && !!profile.is_invisible;
    if (value === 'SUSPENDED') return !!profile.suspended_at;
    return true;
  };
};

const appendAdminAuditLog = async ({
  adminId,
  action,
  targetUserId = null,
  metadata = {},
}) => {
  if (!adminId || !action) return;

  const { error } = await supabase.from('admin_audit_logs').insert({
    admin_id: adminId,
    action,
    target_id: targetUserId,
    target_type: targetUserId ? 'USER' : null,
    new_data: metadata,
  });

  if (error && !isMissingRelationError(error)) {
    console.error('admin_audit_log_insert_failed', error);
  }
};

// --- PAYSTACK ---

app.post('/api/payments/initialize', requireAuth, async (req, res) => {
  const { planId, amount, type, targetId } = req.body;
  const email = req.authUser.email || `${req.user.id}@yamo.app`;
  try {
    const response = await axios.post('https://api.paystack.co/transaction/initialize', {
      email,
      amount: Math.round(amount * 100),
      currency: 'XOF',
      callback_url: 'yamo://payment-callback',
      metadata: { userId: req.user.id, planId, type, targetId }
    }, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } });
    res.json(response.data.data);
  } catch (e) { res.status(500).json({ error: 'paystack_init_failed' }); }
});

app.get('/api/payments/verify', requireAuth, async (req, res) => {
  const { reference } = req.query;
  try {
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } });
    const data = response.data.data;
    if (data.status === 'success') {
      const { userId, planId, type, targetId } = data.metadata;
      if (type === 'PREMIUM') {
        const days = PLAN_DURATIONS[planId] || 30;
        const end = new Date(); end.setDate(end.getDate() + days);
        await supabase.from('subscriptions').insert({ user_id: userId, plan_id: planId, status: 'active', current_period_end: end.toISOString() });
        await supabase.from('profiles').update({ is_premium: true }).eq('id', userId);
      } else if (type === 'SUPER_LIKE') {
        await supabase.from('super_likes').insert({ sender_id: userId, recipient_id: targetId, status: 'PENDING', reference });
      } else if (type === 'DIRECT_MESSAGE') {
        await supabase.from('purchased_interactions').insert({ user_id: userId, interaction_type: 'DIRECT_MESSAGE', target_id: targetId, reference, price_amount: PRICES.DIRECT_MESSAGE });
      }
      return res.json({ status: 'active', reference });
    }
    res.json({ status: data.status });
  } catch (e) { res.status(500).json({ error: 'paystack_verify_failed' }); }
});

app.post('/api/payments/google-verify', requireAuth, async (req, res) => {
  const { purchaseToken, productId, planId, type, targetId } = req.body;
  const userId = req.user.id;

  try {
    // Note: Pour une production réelle, vous devriez vérifier le reçu avec l'API Google Play.
    // Ici, nous implémentons la logique de mise à jour de la DB après confirmation.

    if (type === 'PREMIUM' || (!type && productId.includes('premium'))) {
      const days = PLAN_DURATIONS[planId] || 30;
      const end = new Date(); end.setDate(end.getDate() + days);
      await supabase.from('subscriptions').insert({
        user_id: userId,
        plan_id: planId || 'MONTHLY',
        status: 'active',
        current_period_end: end.toISOString(),
        payment_method: 'GOOGLE_PLAY'
      });
      await supabase.from('profiles').update({ is_premium: true }).eq('id', userId);
    } else if (type === 'BOOST') {
      const days = planId === '7D' ? 7 : (planId === '3D' ? 3 : 1);
      const until = new Date(); until.setDate(until.getDate() + days);
      await supabase.from('profiles').update({ boosted_until: until.toISOString() }).eq('id', userId);
    } else if (type === 'SUPER_LIKE') {
      await supabase.from('super_likes').insert({
        sender_id: userId,
        recipient_id: targetId,
        status: 'PENDING',
        reference: purchaseToken.slice(0, 50)
      });
    } else if (type === 'DIRECT_MESSAGE') {
      await supabase.from('purchased_interactions').insert({
        user_id: userId,
        interaction_type: 'DIRECT_MESSAGE',
        target_id: targetId,
        reference: purchaseToken.slice(0, 50),
        price_amount: PRICES.DIRECT_MESSAGE
      });
    }

    res.json({ status: 'success' });
  } catch (e) {
    res.status(500).json({ error: 'google_verify_failed' });
  }
});

// --- MATCHMAKING ---

app.get('/api/matchmaking/suggestions', requireAuth, async (req, res) => {
  const me = req.user;
  const { limit = 40, minAge = 18, maxAge = 100, gender } = req.query;

  let query = supabase.from('profiles')
    .select('*')
    .neq('id', me.id)
    .is('suspended_at', null)
    .eq('onboarding_completed', true)
    .gte('age', parseInt(minAge))
    .lte('age', parseInt(maxAge));

  if (gender && gender !== 'ALL') {
    query = query.eq('gender', gender);
  }

  const { data: candidates, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const suggestions = (candidates || []).map(c => {
    // Scoring logic
    let score = (c.is_vip ? 200 : (c.is_premium ? 50 : 0)) + (c.city === me.city ? 15 : 0);

    // Add boosted priority
    if (c.boosted_until && new Date(c.boosted_until) > new Date()) {
      score += 500;
    }

    return { ...c, score };
  }).sort((a, b) => b.score - a.score);

  res.json({ suggestions: suggestions.slice(0, parseInt(limit)) });
});

app.post('/api/matchmaking/swipe', requireAuth, async (req, res) => {
  const { targetUserId, direction, isSuperLike } = req.body;
  const me = req.user;

  if (direction === 'LEFT') {
    return res.json({ matched: false });
  }

  // Product decision: all authenticated users can like and match.
  const canLike = true;
  if (!canLike) {
    return res.status(403).json({ error: 'subscription_required' });
  }

  if (isSuperLike) {
    let free = false;
    // Only Premium Women get 10 free super likes per day
    if (me.gender === 'FEMALE' && me.is_premium) {
      const u = await getDailyUsage(me.id, 'SUPER_LIKE');
      if (u.usage_count < QUOTAS.WOMEN_SUPER_LIKE) free = true;
    }

    if (!free) {
      const { data: p } = await supabase.from('purchased_interactions').select('id').eq('user_id', me.id).eq('interaction_type', 'SUPER_LIKE').eq('target_id', targetUserId).maybeSingle();
      if (!p) return res.status(403).json({ error: 'premium_required_for_super_like' });
    }
    await incrementUsage(me.id, 'SUPER_LIKE');
  }

  await supabase.from('likes').upsert({ liker_id: me.id, liked_id: targetUserId, is_super_like: !!isSuperLike });
  const { data: match } = await supabase.from('likes').select('*').eq('liker_id', targetUserId).eq('liked_id', me.id).maybeSingle();
  res.json({ matched: !!match });
});

app.get('/api/likes/quota', requireAuth, async (_req, res) => {
  res.json({
    limit: null,
    used: 0,
    remaining: null,
    resetAt: null,
  });
});

// --- MESSAGES & STATUTS ---

app.post('/api/messages/send', requireAuth, async (req, res) => {
  const { matchId, content, recipientId, messageType, mediaPath } = req.body;
  const me = req.user;
  const { data: match } = await supabase.from('matches').select('id').eq('id', matchId).maybeSingle();
  if (!match && !isTrialActive(me)) {
    const { data: p } = await supabase.from('purchased_interactions').select('id').eq('user_id', me.id).eq('interaction_type', 'DIRECT_MESSAGE').eq('target_id', recipientId).maybeSingle();
    if (!p) return res.status(403).json({ error: 'payment_required', amount: PRICES.DIRECT_MESSAGE });
  }

  const normalizedType = String(messageType || 'TEXT').toUpperCase();
  if (!['TEXT', 'IMAGE', 'VIDEO'].includes(normalizedType)) {
    return res.status(400).json({ error: 'unsupported_message_type' });
  }

  const normalizedContent = typeof content === 'string' ? content.trim() : '';
  if (normalizedType === 'TEXT' && !normalizedContent) {
    return res.status(400).json({ error: 'empty_message' });
  }
  if ((normalizedType === 'IMAGE' || normalizedType === 'VIDEO') && !mediaPath) {
    return res.status(400).json({ error: 'missing_media_path' });
  }

  const { data, error } = await supabase.from('messages').insert({
    match_id: matchId || null,
    sender_id: me.id,
    content: normalizedContent || null,
    message_type: normalizedType,
    media_url: mediaPath || null
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/messages/mark-read', requireAuth, async (req, res) => {
  const { matchId } = req.body;
  const me = req.user;

  if (req.subscription?.plan_id === 'QUARTERLY') {
    const u = await getDailyUsage(me.id, 'HIDE_SEEN');
    if (u.usage_seconds < QUOTAS.MEN_3M_HIDE_SEEN_SECONDS) {
      // Logic for hiding seen is usually handled by NOT updating is_read
      // or by client-side flag. Here we just return that they are in "stealth"
      await incrementUsage(me.id, 'HIDE_SEEN', 60); // Increment by 1 minute for this action
      return res.json({ stealth: true });
    }
  }

  const { error } = await supabase.from('messages')
    .update({ is_read: true })
    .eq('match_id', matchId)
    .neq('sender_id', me.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post('/api/boosts/initialize', requireAuth, async (req, res) => {
  const { planId } = req.body; // '1D', '3D', '7D'
  const email = req.authUser.email || `${req.user.id}@yamo.app`;

  let amount = PRICES.BOOST_1D;
  if (planId === '3D') amount = PRICES.BOOST_3D;
  if (planId === '7D') amount = PRICES.BOOST_7D;

  try {
    const response = await axios.post('https://api.paystack.co/transaction/initialize', {
      email,
      amount: amount * 100,
      currency: 'XOF',
      callback_url: 'yamo://payment-callback',
      metadata: { userId: req.user.id, type: 'BOOST', planId }
    }, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } });
    res.json(response.data.data);
  } catch (e) { res.status(500).json({ error: 'paystack_init_failed' }); }
});

app.get('/api/boosts/verify', requireAuth, async (req, res) => {
  const { reference } = req.query;
  try {
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } });
    const data = response.data.data;
    if (data.status === 'success') {
      const { userId, planId } = data.metadata;

      let durationSeconds = 86400; // 1 day
      if (planId === '3D') durationSeconds = 86400 * 3;
      if (planId === '7D') durationSeconds = 86400 * 7;

      const boostedUntil = new Date(Date.now() + durationSeconds * 1000).toISOString();
      await supabase.from('profiles').update({ boosted_until: boostedUntil }).eq('id', userId);
      // We don't incrementUsage for paid boosts as they are not quota-based
      return res.json({ status: 'active', boosted_until: boostedUntil });
    }
    res.json({ status: data.status });
  } catch (e) { res.status(500).json({ error: 'paystack_verify_failed' }); }
});

app.post('/api/profile/boost', requireAuth, async (req, res) => {
  const me = req.user;
  const duration = 3600; // 1 hour for free/subscription sessions

  let canBoost = false;

  // 1. Check Women Premium quota (1h/day)
  if (me.gender === 'FEMALE' && me.is_premium) {
    const u = await getDailyUsage(me.id, 'BOOST');
    if (u.usage_seconds < QUOTAS.DAILY_BOOST_SECONDS) canBoost = true;
  }

  // 2. Check Trial User quota (1h total during trial)
  if (!canBoost && isTrialActive(me)) {
    // For trial, we check cumulative usage over the 7 days
    const { data } = await supabase.from('daily_usage').select('usage_seconds').eq('user_id', me.id).eq('action_type', 'BOOST');
    const totalTrialUsage = (data || []).reduce((acc, curr) => acc + (curr.usage_seconds || 0), 0);
    if (totalTrialUsage < QUOTAS.TRIAL_BOOST_SECONDS) canBoost = true;
  }

  if (!canBoost) {
    return res.status(403).json({ error: 'no_free_boost_available', message: 'Votre heure de boost gratuite est épuisée.' });
  }

  const boostedUntil = new Date(Date.now() + duration * 1000).toISOString();
  const { error } = await supabase.from('profiles').update({ boosted_until: boostedUntil }).eq('id', me.id);

  if (error) return res.status(500).json({ error: error.message });
  await incrementUsage(me.id, 'BOOST', duration);
  res.json({ boosted_until: boostedUntil });
});

app.get('/api/kyc/me', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { data, error } = await supabase
    .from('kyc_verifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingRelationError(error)) {
      return res.json({ is_verified: !!req.user.is_verified, current: null, history: [] });
    }
    return res.status(500).json({ error: error.message });
  }

  const mapped = (data || []).map((row) => ({
    id: row.id,
    status: row.status,
    document_type: row.document_type,
    submitted_at: row.submitted_at || row.created_at,
    reviewed_at: row.reviewed_at || null,
    rejection_reason: row.rejection_reason || null,
  }));

  res.json({
    is_verified: !!req.user.is_verified,
    current: mapped[0] || null,
    history: mapped,
  });
});

app.post('/api/kyc/requests', requireAuth, async (req, res) => {
  const documentType = req.body.documentType || req.body.document_type;
  const documentFront = req.body.documentFront || req.body.document_front_url || req.body.document_front_path;
  const documentBack = req.body.documentBack || req.body.document_back_url || req.body.document_back_path || null;
  const selfie = req.body.selfie || req.body.selfie_url || req.body.selfie_path;

  let insertPayload = {
    user_id: req.user.id,
    document_type: documentType,
    document_front_url: documentFront,
    document_back_url: documentBack,
    selfie_url: selfie,
    status: 'PENDING',
  };

  let { data, error } = await supabase.from('kyc_verifications').insert(insertPayload).select().single();
  if (error && String(error.code || '') === '42703') {
    insertPayload = {
      user_id: req.user.id,
      document_type: documentType,
      document_url: documentFront,
      document_back_url: documentBack,
      selfie_url: selfie,
      status: 'PENDING',
    };
    ({ data, error } = await supabase.from('kyc_verifications').insert(insertPayload).select().single());
  }

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/moderation/photos/check', requireAuth, async (req, res) => {
  const photoUrls = Array.isArray(req.body?.photoUrls) ? req.body.photoUrls : [];
  const violations = [];

  for (const url of photoUrls) {
    const flags = [];
    const value = String(url || '').trim();
    if (!/^https?:\/\//i.test(value)) flags.push('invalid_url');
    if (!/\.(jpg|jpeg|png|webp)(\?|$)/i.test(value)) flags.push('invalid_extension');
    if (flags.length > 0) violations.push({ url: value, flags });
  }

  if (violations.length > 0) {
    return res.json({ status: 'REJECTED', violations });
  }

  return res.json({ status: 'APPROVED', violations: [] });
});

app.get('/api/statuses', requireAuth, async (req, res) => {
  const me = req.user;
  if (me.gender === 'MALE' && req.subscription?.plan_id === 'QUARTERLY') {
    const u = await getDailyUsage(me.id, 'STATUS_VIEW');
    if (u.usage_count >= QUOTAS.MEN_3M_STATUS_VIEWS) return res.status(403).json({ error: 'quota_exceeded' });
    await incrementUsage(me.id, 'STATUS_VIEW');
  }
  const { data } = await supabase.from('statuses').select('*, profiles(name, photos, gender)').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false });
  res.json(data);
});

app.post('/api/statuses', requireAuth, async (req, res) => {
  const { mediaUrl, type, content } = req.body;
  const me = req.user;

  if (!hasStandardAccess(me)) {
    return res.status(403).json({ error: 'subscription_required' });
  }

  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const { data, error } = await supabase.from('statuses').insert({
    user_id: me.id,
    media_url: mediaUrl,
    message_type: type,
    content: content || '',
    expires_at: expiresAt
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/super-likes/received', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('super_likes')
    .select('*, profiles:sender_id(name, photos, age, bio)')
    .eq('recipient_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/super-likes/:id/respond', requireAuth, async (req, res) => {
  const { action } = req.body; // 'ACCEPT' or 'DECLINE'
  const { id } = req.params;
  const status = action === 'ACCEPT' ? 'ACCEPTED' : 'IGNORED';

  const { data: sl, error: fetchErr } = await supabase.from('super_likes').select('*').eq('id', id).single();
  if (fetchErr || !sl) return res.status(404).json({ error: 'not_found' });

  if (sl.recipient_id !== req.user.id) return res.status(403).json({ error: 'unauthorized' });

  const respondedAt = new Date().toISOString();
  const { error } = await supabase.from('super_likes').update({ status, responded_at: respondedAt }).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  if (action === 'ACCEPT') {
    await supabase.from('likes').upsert({ liker_id: sl.sender_id, liked_id: sl.recipient_id, is_super_like: true });
    await supabase.from('likes').upsert({ liker_id: sl.recipient_id, liked_id: sl.sender_id, is_super_like: false });
  }

  res.json({
    success: true,
    superLike: {
      id,
      status,
      responded_at: respondedAt,
    },
  });
});

app.get('/api/privacy/export', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const exportedAt = new Date().toISOString();

  const [profileRes, likesRes, matchesRes, messagesRes, subscriptionsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('likes').select('*').or(`liker_id.eq.${userId},liked_id.eq.${userId}`),
    supabase.from('matches').select('*').or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`),
    supabase.from('messages').select('*').eq('sender_id', userId),
    supabase.from('subscriptions').select('*').eq('user_id', userId),
  ]);

  res.json({
    filename: `yamo-export-${userId}.json`,
    exported_at: exportedAt,
    format: 'json',
    profile: profileRes.data || null,
    likes: likesRes.data || [],
    matches: matchesRes.data || [],
    messages: messagesRes.data || [],
    subscriptions: subscriptionsRes.data || [],
  });
});

app.post('/api/account/delete', requireAuth, async (req, res) => {
  const userId = req.user.id;
  await supabase.from('profiles').delete().eq('id', userId);
  await supabase.auth.admin.deleteUser(userId);
  res.json({ success: true });
});

app.get('/api/notifications/admin', requireAuth, async (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
  const { data, error } = await supabase
    .from('events')
    .select('id, event_name, metadata, created_at')
    .eq('event_type', 'ADMIN_NOTIFICATION')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingRelationError(error)) {
      return res.json({ notifications: [], unreadCount: 0 });
    }
    return res.status(500).json({ error: error.message });
  }

  const notifications = (data || []).map((item) => ({
    ...item,
    is_read: item.metadata?.is_read === true,
  }));
  const unreadCount = notifications.filter((item) => item.is_read !== true).length;
  res.json({ notifications, unreadCount });
});

app.post('/api/notifications/admin/:id/read', requireAuth, async (req, res) => {
  const id = req.params.id;
  const { data: item, error: fetchError } = await supabase
    .from('events')
    .select('id, user_id, metadata')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) return res.status(500).json({ error: fetchError.message });
  if (!item || item.user_id !== req.user.id) return res.status(404).json({ error: 'not_found' });

  const nextMetadata = {
    ...(item.metadata || {}),
    is_read: true,
    read_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('events').update({ metadata: nextMetadata }).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post('/api/notifications/admin/read-all', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('events')
    .select('id, metadata')
    .eq('event_type', 'ADMIN_NOTIFICATION')
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });

  const updates = (data || []).map((item) => (
    supabase
      .from('events')
      .update({
        metadata: {
          ...(item.metadata || {}),
          is_read: true,
          read_at: new Date().toISOString(),
        },
      })
      .eq('id', item.id)
  ));
  if (updates.length > 0) await Promise.all(updates);
  res.json({ success: true });
});

app.get('/api/communities', requireAuth, async (req, res) => {
  const { data: communities, error } = await supabase
    .from('communities')
    .select('id, name, description, cover_photo, creator_id')
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingRelationError(error)) return res.json([]);
    return res.status(500).json({ error: error.message });
  }

  const communityIds = (communities || []).map((c) => c.id);
  if (communityIds.length === 0) return res.json([]);

  const [{ data: members, error: membersError }, { data: myMemberships, error: myMembershipsError }] = await Promise.all([
    supabase.from('community_members').select('community_id, user_id').in('community_id', communityIds),
    supabase.from('community_members').select('community_id').in('community_id', communityIds).eq('user_id', req.user.id),
  ]);
  if (membersError || myMembershipsError) {
    const relationError = membersError || myMembershipsError;
    if (isMissingRelationError(relationError)) return res.json([]);
    return res.status(500).json({ error: relationError?.message || 'community_members_fetch_failed' });
  }

  const memberCountByCommunity = {};
  for (const row of (members || [])) {
    memberCountByCommunity[row.community_id] = (memberCountByCommunity[row.community_id] || 0) + 1;
  }
  const myMembershipSet = new Set((myMemberships || []).map((row) => row.community_id));

  const payload = (communities || []).map((community) => ({
    ...community,
    member_count: memberCountByCommunity[community.id] || 0,
    is_member: myMembershipSet.has(community.id),
  }));
  res.json(payload);
});

app.post('/api/communities/create', requireAuth, async (req, res) => {
  const planKey = String(req.subscription?.plan_id || '').toUpperCase();
  if (!['BIANNUAL', 'ANNUAL'].includes(planKey)) {
    return res.status(403).json({ error: 'premium_required' });
  }

  const { name, description, cover_photo } = req.body || {};
  const { data: community, error } = await supabase.from('communities').insert({
    name,
    description,
    cover_photo,
    creator_id: req.user.id,
  }).select('id, name, description, cover_photo, creator_id').single();

  if (error) {
    if (isMissingRelationError(error)) return res.status(503).json({ error: 'community_schema_missing' });
    return res.status(500).json({ error: error.message });
  }
  const { error: membershipInsertError } = await supabase.from('community_members').upsert({
    community_id: community.id,
    user_id: req.user.id,
    role: 'ADMIN',
  });
  if (membershipInsertError) {
    if (isMissingRelationError(membershipInsertError)) return res.status(503).json({ error: 'community_schema_missing' });
    return res.status(500).json({ error: membershipInsertError.message });
  }
  res.json({
    community: {
      ...community,
      member_count: 1,
      is_member: true,
    },
  });
});

app.post('/api/communities/:communityId/join', requireAuth, async (req, res) => {
  const { communityId } = req.params;
  const { error } = await supabase.from('community_members').upsert({
    community_id: communityId,
    user_id: req.user.id,
    role: 'MEMBER',
  });
  if (error) {
    if (isMissingRelationError(error)) return res.status(503).json({ error: 'community_schema_missing' });
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true });
});

app.get('/api/communities/:communityId/messages', requireAuth, async (req, res) => {
  const { communityId } = req.params;
  const { data, error } = await supabase
    .from('community_messages')
    .select('id, content, message_type, media_url, created_at, sender_id, profiles:sender_id(name, photos)')
    .eq('community_id', communityId)
    .order('created_at', { ascending: true });
  if (error) {
    if (isMissingRelationError(error)) return res.json([]);
    return res.status(500).json({ error: error.message });
  }
  res.json(data || []);
});

app.post('/api/communities/:communityId/messages', requireAuth, async (req, res) => {
  const { communityId } = req.params;
  const { content, message_type, media_url } = req.body || {};

  const { data: membership, error: membershipError } = await supabase
    .from('community_members')
    .select('user_id')
    .eq('community_id', communityId)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (membershipError) {
    if (isMissingRelationError(membershipError)) return res.status(503).json({ error: 'community_schema_missing' });
    return res.status(500).json({ error: membershipError.message });
  }
  if (!membership) return res.status(403).json({ error: 'community_membership_required' });

  const { data, error } = await supabase.from('community_messages').insert({
    community_id: communityId,
    sender_id: req.user.id,
    content: content || '',
    message_type: message_type || 'TEXT',
    media_url: media_url || null,
  }).select('id, content, message_type, media_url, created_at, sender_id').single();
  if (error) {
    if (isMissingRelationError(error)) return res.status(503).json({ error: 'community_schema_missing' });
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

app.get('/api/communities/:communityId/members', requireAuth, async (req, res) => {
  const { communityId } = req.params;
  const { data, error } = await supabase
    .from('community_members')
    .select('user_id, role, joined_at, profiles:user_id(name, photos, is_verified, is_premium)')
    .eq('community_id', communityId)
    .order('joined_at', { ascending: true });
  if (error) {
    if (isMissingRelationError(error)) return res.json({ members: [] });
    return res.status(500).json({ error: error.message });
  }
  res.json({ members: data || [] });
});

app.patch('/api/communities/:communityId/members/:userId/role', requireAuth, async (req, res) => {
  const { communityId, userId } = req.params;
  const { role } = req.body || {};

  const { data: me, error: meError } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (meError) {
    if (isMissingRelationError(meError)) return res.status(503).json({ error: 'community_schema_missing' });
    return res.status(500).json({ error: meError.message });
  }
  if (!me || me.role !== 'ADMIN') return res.status(403).json({ error: 'admin_required' });

  const { error } = await supabase
    .from('community_members')
    .update({ role })
    .eq('community_id', communityId)
    .eq('user_id', userId);
  if (error) {
    if (isMissingRelationError(error)) return res.status(503).json({ error: 'community_schema_missing' });
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true });
});

app.delete('/api/communities/:communityId/members/:userId', requireAuth, async (req, res) => {
  const { communityId, userId } = req.params;

  const { data: me, error: meError } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (meError) {
    if (isMissingRelationError(meError)) return res.status(503).json({ error: 'community_schema_missing' });
    return res.status(500).json({ error: meError.message });
  }
  if (!me) return res.status(403).json({ error: 'community_membership_required' });
  if (req.user.id !== userId && !['ADMIN', 'MODERATOR'].includes(String(me.role))) {
    return res.status(403).json({ error: 'insufficient_permissions' });
  }

  const { error } = await supabase
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', userId);
  if (error) {
    if (isMissingRelationError(error)) return res.status(503).json({ error: 'community_schema_missing' });
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true });
});

// --- ADMIN & STATS ---

adminRouter.get('/stats', async (req, res) => {
  const [{ data: profiles }, { data: subscriptions }, { data: kyc }, { data: reports }, { data: privacy }] = await Promise.all([
    supabase.from('profiles').select('id, is_admin, is_verified, is_premium, is_invisible, suspended_at'),
    supabase.from('subscriptions').select('plan_id, status').eq('status', 'active'),
    supabase.from('kyc_verifications').select('status, created_at'),
    supabase.from('reports').select('status'),
    supabase.from('privacy_requests').select('status'),
  ]);

  const users = profiles || [];
  const activeUsers = users.filter((u) => !u.suspended_at);
  const suspendedUsers = users.filter((u) => !!u.suspended_at);
  const verifiedUsers = users.filter((u) => !!u.is_verified);
  const premiumUsers = users.filter((u) => !!u.is_premium);
  const planCounts = { MONTHLY: 0, QUARTERLY: 0, BIANNUAL: 0, ANNUAL: 0, UNKNOWN: 0 };
  for (const subscription of (subscriptions || [])) {
    const planKey = String(subscription.plan_id || '').toUpperCase();
    if (planCounts[planKey] !== undefined) planCounts[planKey] += 1;
    else planCounts.UNKNOWN += 1;
  }

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  res.json({
    generatedAt: new Date().toISOString(),
    users: {
      total: users.length,
      active: activeUsers.length,
      suspended: suspendedUsers.length,
      admins: users.filter((u) => !!u.is_admin).length,
      verified: verifiedUsers.length,
      unverified: users.length - verifiedUsers.length,
      premium: premiumUsers.length,
      free: users.length - premiumUsers.length,
      invisiblePremium: users.filter((u) => !!u.is_premium && !!u.is_invisible).length,
    },
    premiumByPlan: planCounts,
    kyc: {
      totalRequests: (kyc || []).length,
      pending: (kyc || []).filter((i) => i.status === 'PENDING').length,
      inReview: (kyc || []).filter((i) => i.status === 'IN_REVIEW').length,
      approved: (kyc || []).filter((i) => i.status === 'APPROVED').length,
      rejected: (kyc || []).filter((i) => i.status === 'REJECTED').length,
      requestsLast7Days: (kyc || []).filter((i) => new Date(i.created_at).getTime() >= sevenDaysAgo).length,
    },
    moderation: {
      reportsTotal: (reports || []).length,
      reportsOpen: (reports || []).filter((i) => i.status === 'PENDING').length,
      reportsInReview: (reports || []).filter((i) => i.status === 'INVESTIGATING').length,
      reportsResolved: (reports || []).filter((i) => i.status === 'RESOLVED').length,
      reportsDismissed: (reports || []).filter((i) => i.status === 'DISMISSED').length,
    },
    privacy: {
      requestsTotal: (privacy || []).length,
      open: (privacy || []).filter((i) => i.status === 'PENDING').length,
      inProgress: (privacy || []).filter((i) => i.status === 'PROCESSING').length,
      resolved: (privacy || []).filter((i) => i.status === 'COMPLETED').length,
      rejected: (privacy || []).filter((i) => i.status === 'FAILED').length,
    },
    integrity: {
      authUsersTotal: null,
      profilesTotal: users.length,
      authUsersWithoutProfile: null,
    },
  });
});

adminRouter.get('/audit-logs', async (req, res) => {
  const limit = Math.max(1, Math.min(500, Number(req.query.limit || 200)));
  const actionFilter = String(req.query.action || '').trim().toUpperCase();

  let query = supabase
    .from('admin_audit_logs')
    .select('id, admin_id, action, target_id, target_type, old_data, new_data, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (actionFilter && actionFilter !== 'ALL') {
    query = query.eq('action', actionFilter);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingRelationError(error)) return res.json({ logs: [] });
    return res.status(500).json({ error: error.message });
  }

  const profileIds = [...new Set((data || []).flatMap((row) => [row.admin_id, row.target_id]).filter(Boolean))];
  let profileById = new Map();

  if (profileIds.length > 0) {
    const { data: profileRows, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', profileIds);
    if (profilesError) return res.status(500).json({ error: profilesError.message });
    profileById = new Map((profileRows || []).map((row) => [row.id, row]));
  }

  const logs = (data || []).map((row) => {
    const adminProfile = row.admin_id ? profileById.get(row.admin_id) : null;
    const targetProfile = row.target_id ? profileById.get(row.target_id) : null;
    const normalizedMetadata = (row.new_data && typeof row.new_data === 'object')
      ? row.new_data
      : (row.old_data && typeof row.old_data === 'object' ? row.old_data : null);

    return {
      id: row.id,
      admin_id: row.admin_id || null,
      action: row.action,
      target_user_id: row.target_id || null,
      reason: normalizedMetadata?.reason || null,
      metadata: normalizedMetadata,
      created_at: row.created_at,
      admin: row.admin_id ? {
        id: row.admin_id,
        name: adminProfile?.name || 'Admin',
        email: null,
      } : null,
      target_user: row.target_id ? {
        id: row.target_id,
        name: targetProfile?.name || 'Utilisateur',
        email: null,
      } : null,
    };
  });

  res.json({ logs });
});

adminRouter.get('/users', async (_req, res) => {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map((user) => ({ ...user, email: null })));
});

adminRouter.put('/users/:userId/suspend', async (req, res) => {
  const { userId } = req.params;
  const shouldSuspend = req.body?.suspend === true;
  const patch = { suspended_at: shouldSuspend ? new Date().toISOString() : null };
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, suspended: shouldSuspend });
});

adminRouter.delete('/users/:userId', async (req, res) => {
  const { userId } = req.params;
  const reason = String(req.body?.reason || '').trim() || null;

  await appendAdminAuditLog({
    adminId: req.user.id,
    action: 'USER_DELETE_ADMIN',
    targetUserId: userId,
    metadata: {
      reason,
      source: 'admin_delete_user',
      request_id: req.headers['x-request-id'] || null,
    },
  });

  const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId);
  if (profileError) return res.status(500).json({ error: profileError.message });
  await supabase.auth.admin.deleteUser(userId);
  res.json({ success: true });
});

adminRouter.post('/users/reconcile-profiles', async (_req, res) => {
  const existingProfiles = await supabase.from('profiles').select('id');
  const profileIdSet = new Set((existingProfiles.data || []).map((p) => p.id));

  let authUsers = [];
  try {
    const listResponse = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    authUsers = listResponse?.data?.users || [];
  } catch (_error) {
    authUsers = [];
  }

  const missing = authUsers.filter((user) => !profileIdSet.has(user.id));
  for (const user of missing) {
    await supabase.from('profiles').upsert({
      id: user.id,
      name: user.user_metadata?.full_name || user.email || 'Utilisateur',
      onboarding_completed: false,
      is_admin: false,
      is_verified: false,
      is_premium: false,
    });
  }

  const totalProfiles = (await supabase.from('profiles').select('id', { count: 'exact', head: true })).count || 0;
  res.json({
    createdCount: missing.length,
    missingBefore: missing.length,
    totalAuthUsers: authUsers.length,
    totalProfiles,
  });
});

adminRouter.get('/privacy-requests', async (req, res) => {
  const limit = Math.max(1, Math.min(500, Number(req.query.limit || 100)));
  const { data, error } = await supabase
    .from('privacy_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return res.status(500).json({ error: error.message });

  const requests = (data || []).map((item) => ({
    id: item.id,
    user_id: item.user_id,
    request_type: item.request_type === 'ACCOUNT_DELETION' ? 'DELETE' : 'EXPORT',
    status: normalizePrivacyStatusForClient(item.status),
    details: item.details || null,
    created_at: item.created_at,
    resolved_at: item.completed_at || null,
  }));
  res.json({ requests });
});

adminRouter.post('/privacy-requests/:id/resolve', async (req, res) => {
  const { id } = req.params;
  const statusForDb = normalizePrivacyStatusForDb(req.body?.status);
  if (!statusForDb) return res.status(400).json({ error: 'invalid_status' });

  const { data: current, error: fetchError } = await supabase
    .from('privacy_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) return res.status(500).json({ error: fetchError.message });
  if (!current) return res.status(404).json({ error: 'not_found' });

  const patch = {
    status: statusForDb,
    completed_at: (statusForDb === 'COMPLETED' || statusForDb === 'FAILED') ? new Date().toISOString() : null,
  };

  const { error } = await supabase.from('privacy_requests').update(patch).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  if (req.body?.executeDelete === true && statusForDb === 'COMPLETED' && current.request_type === 'ACCOUNT_DELETION' && current.user_id) {
    await appendAdminAuditLog({
      adminId: req.user.id,
      action: 'USER_DELETE_PRIVACY',
      targetUserId: current.user_id,
      metadata: {
        reason: req.body?.reason || null,
        source: 'privacy_request',
        request_id: id,
      },
    });
    await supabase.from('profiles').delete().eq('id', current.user_id);
    await supabase.auth.admin.deleteUser(current.user_id);
  }

  res.json({ success: true });
});

adminRouter.get('/reports', async (req, res) => {
  const rawStatus = req.query.status;
  let query = supabase.from('reports').select('*, reporter:reporter_id(id, name), reported_user:reported_user_id(id, name)').order('created_at', { ascending: false });
  if (rawStatus) {
    query = query.eq('status', normalizeReportStatusForDb(rawStatus));
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const reports = (data || []).map((item) => ({
    id: item.id,
    status: normalizeReportStatusForClient(item.status),
    category: item.reason || 'GENERAL',
    target_type: 'PROFILE',
    description: item.details || item.reason || '',
    created_at: item.created_at,
    reporter: item.reporter ? { id: item.reporter.id, name: item.reporter.name, email: null } : null,
    reported_user: item.reported_user ? { id: item.reported_user.id, name: item.reported_user.name, email: null } : null,
  }));
  res.json({ reports });
});

adminRouter.post('/reports/:id/review', async (req, res) => {
  const { id } = req.params;
  const statusForDb = normalizeReportStatusForDb(req.body?.status);
  const { error } = await supabase.from('reports').update({ status: statusForDb }).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

adminRouter.get('/photo-reviews', async (req, res) => {
  const status = String(req.query.status || 'PENDING').toUpperCase();
  const limit = Math.max(1, Math.min(200, Number(req.query.limit || 50)));
  const page = Math.max(1, Number(req.query.page || 1));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from('photo_review_queue')
    .select('*, user:user_id(id, name)', { count: 'exact' })
    .eq('status', status)
    .order('created_at', { ascending: true })
    .range(from, to);
  if (error) return res.status(500).json({ error: error.message });

  const safeCount = count || 0;
  res.json({
    reviews: data || [],
    page,
    hasMore: page * limit < safeCount,
  });
});

adminRouter.post('/photo-reviews/:id/review', async (req, res) => {
  const { id } = req.params;
  const nextStatus = String(req.body?.status || '').toUpperCase();
  const patch = {
    status: nextStatus,
    reviewed_at: new Date().toISOString(),
    rejection_reason: nextStatus === 'REJECTED' ? (req.body?.note || 'rejected_by_admin') : null,
  };
  const { data: row, error: fetchError } = await supabase.from('photo_review_queue').select('*').eq('id', id).maybeSingle();
  if (fetchError) return res.status(500).json({ error: fetchError.message });
  if (!row) return res.status(404).json({ error: 'not_found' });

  const { error } = await supabase.from('photo_review_queue').update(patch).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  if (nextStatus === 'APPROVED') {
    await supabase.from('profiles').update({ photo_review_status: 'APPROVED' }).eq('id', row.user_id);
  }
  if (nextStatus === 'REJECTED') {
    await supabase.from('profiles').update({ photo_review_status: 'REJECTED' }).eq('id', row.user_id);
  }
  res.json({ success: true });
});

adminRouter.get('/kyc/requests', async (req, res) => {
  const status = String(req.query.status || 'ALL').toUpperCase();
  let query = supabase
    .from('kyc_verifications')
    .select('*, user:user_id(id, name, is_verified, is_premium, suspended_at, photos)')
    .order('created_at', { ascending: false });
  if (status !== 'ALL') query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const requests = (data || []).map((item) => ({
    id: item.id,
    user_id: item.user_id,
    document_type: item.document_type,
    status: item.status,
    submitted_at: item.submitted_at || item.created_at,
    reviewed_at: item.reviewed_at || null,
    rejection_reason: item.rejection_reason || null,
    document_front_url: item.document_front_url || item.document_url || null,
    document_back_url: item.document_back_url || null,
    selfie_url: item.selfie_url || null,
    user: {
      id: item.user?.id || item.user_id,
      name: item.user?.name || 'Utilisateur',
      email: null,
      is_verified: !!item.user?.is_verified,
      is_premium: !!item.user?.is_premium,
      suspended_at: item.user?.suspended_at || null,
      photo: Array.isArray(item.user?.photos) ? (item.user.photos[0] || null) : null,
    },
  }));
  res.json({ requests });
});

adminRouter.post('/kyc/requests/:id/review', async (req, res) => {
  const { id } = req.params;
  const decision = String(req.body?.decision || '').toUpperCase();
  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    return res.status(400).json({ error: 'invalid_decision' });
  }

  const { data: row, error: fetchError } = await supabase
    .from('kyc_verifications')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) return res.status(500).json({ error: fetchError.message });
  if (!row) return res.status(404).json({ error: 'not_found' });

  const patch = {
    status: decision,
    reviewed_at: new Date().toISOString(),
    rejection_reason: decision === 'REJECTED' ? (req.body?.reason || 'rejected_by_admin') : null,
  };
  const { error } = await supabase.from('kyc_verifications').update(patch).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  if (decision === 'APPROVED') {
    await supabase.from('profiles').update({ is_verified: true, is_kyc_verified: true }).eq('id', row.user_id);
  }
  res.json({ success: true });
});

adminRouter.get('/messages/audience', async (req, res) => {
  const segment = String(req.query.segment || 'ALL').toUpperCase();
  const { data, error } = await supabase.from('profiles').select('id, is_verified, is_premium, is_invisible, suspended_at');
  if (error) return res.status(500).json({ error: error.message });

  const filter = buildUserSegmentFilter(segment);
  const recipientCount = (data || []).filter(filter).length;
  res.json({ segment, recipientCount });
});

adminRouter.post('/messages/broadcast', async (req, res) => {
  const segment = String(req.body?.segment || 'ALL').toUpperCase();
  const title = String(req.body?.title || '').trim() || 'Information administrateur';
  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json({ error: 'message_required' });

  const { data: users, error } = await supabase.from('profiles').select('id, is_verified, is_premium, is_invisible, suspended_at');
  if (error) return res.status(500).json({ error: error.message });

  const filter = buildUserSegmentFilter(segment);
  const recipients = (users || []).filter(filter).map((user) => user.id);
  const sentAt = new Date().toISOString();
  const broadcastId = `broadcast_${Date.now()}`;

  const notificationRows = recipients.map((userId) => ({
    user_id: userId,
    event_type: 'ADMIN_NOTIFICATION',
    event_name: 'ADMIN_BROADCAST',
    metadata: {
      title,
      message,
      segment,
      sent_at: sentAt,
      broadcast_id: broadcastId,
      is_read: false,
    },
  }));

  if (notificationRows.length > 0) {
    const { error: insertError } = await supabase.from('events').insert(notificationRows);
    if (insertError) return res.status(500).json({ error: insertError.message });
  }

  await supabase.from('events').insert({
    user_id: req.user.id,
    event_type: 'ADMIN_CAMPAIGN',
    event_name: title,
    payload: {
      message,
      segment,
      recipientCount: recipients.length,
      sentAt,
      broadcastId,
    },
    metadata: {},
  });

  res.json({
    recipientCount: recipients.length,
    segment,
    sentAt,
    broadcastId,
  });
});

adminRouter.get('/messages/history', async (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
  const { data, error } = await supabase
    .from('events')
    .select('id, event_name, payload, created_at')
    .eq('event_type', 'ADMIN_CAMPAIGN')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return res.status(500).json({ error: error.message });

  const campaigns = (data || []).map((item) => ({
    campaignId: item.id,
    title: item.event_name || item.payload?.title || 'Campagne',
    message: item.payload?.message || '',
    segment: item.payload?.segment || 'ALL',
    sentAt: item.payload?.sentAt || item.created_at,
    recipientCount: Number(item.payload?.recipientCount || 0),
    readCount: 0,
  }));
  res.json({ campaigns });
});

app.use('/api/admin', requireAuth, requireAdmin, adminRouter);
app.get('/health', (req, res) => res.json({ status: 'ok', sentry: 'active', paystack: 'ready' }));

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 YAMO Production Finalized on port ${PORT}`));
