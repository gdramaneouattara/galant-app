const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({
  limit: '1mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf.toString();
  },
}));

const {
  PORT = 8787,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  PAYSTACK_SECRET_KEY,
  SIMULATE_PAYMENTS = 'false',
  PAYSTACK_SIMULATE = 'false',
  PAYSTACK_CURRENCY = 'XOF',
  PAYSTACK_CALLBACK_URL,
  PLAN_MONTHLY_AMOUNT = '300000',
  PLAN_QUARTERLY_AMOUNT = '900000',
  PLAN_BIANNUAL_AMOUNT = '1500000',
  PLAN_ANNUAL_AMOUNT = '3000000',
  BOOST_DAILY_AMOUNT = '100000',
  BOOST_3_DAYS_AMOUNT = '250000',
  BOOST_7_DAYS_AMOUNT = '500000',
  KYC_PROVIDER = 'manual',
  KYC_VERIFICATION_URL = '',
} = process.env;

const simulatePayments =
  SIMULATE_PAYMENTS.toLowerCase() === 'true' || PAYSTACK_SIMULATE.toLowerCase() === 'true';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}
if (!PAYSTACK_SECRET_KEY && !simulatePayments) {
  throw new Error('Missing PAYSTACK_SECRET_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const simulatedPayments = new Map();

const PLAN_CONFIG = {
  MONTHLY: { amount: Number(PLAN_MONTHLY_AMOUNT), durationDays: 30 },
  QUARTERLY: { amount: Number(PLAN_QUARTERLY_AMOUNT), durationDays: 90 },
  BIANNUAL: { amount: Number(PLAN_BIANNUAL_AMOUNT), durationDays: 180 },
  ANNUAL: { amount: Number(PLAN_ANNUAL_AMOUNT), durationDays: 365 },
};

const BOOST_CONFIG = {
  DAILY: { amount: Number(BOOST_DAILY_AMOUNT), durationDays: 1 },
  THREE_DAYS: { amount: Number(BOOST_3_DAYS_AMOUNT), durationDays: 3 },
  SEVEN_DAYS: { amount: Number(BOOST_7_DAYS_AMOUNT), durationDays: 7 },
};

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_token' });

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: 'invalid_token' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, suspended_at')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        return res.status(403).json({ error: 'profile_not_found' });
      }
      return res.status(500).json({ error: 'profile_lookup_failed' });
    }
    if (!profile) {
      return res.status(403).json({ error: 'profile_not_found' });
    }
    if (profile.suspended_at) {
      return res.status(403).json({ error: 'suspended_account' });
    }

    req.user = {
      id: data.user.id,
      email: data.user.email || '',
      isAdmin: !!profile.is_admin,
    };
    return next();
  } catch (err) {
    console.error('Auth check failed:', err);
    return res.status(500).json({ error: 'auth_check_failed' });
  }
};

const requireAdmin = async (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'forbidden' });
  }
  next();
};

const PREMIUM_PLAN_KEYS = ['MONTHLY', 'QUARTERLY', 'BIANNUAL', 'ANNUAL'];
const INVISIBLE_MODE_PLAN_KEYS = ['BIANNUAL', 'ANNUAL'];
const BROADCAST_SEGMENTS = [
  'ALL',
  'ACTIVE',
  'SUSPENDED',
  'VERIFIED',
  'UNVERIFIED',
  'PREMIUM',
  'FREE',
  'INVISIBLE_PREMIUM',
];

const asObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
};

const normalizeSegment = (value) => {
  const segment = (value || 'ALL').toString().toUpperCase();
  return BROADCAST_SEGMENTS.includes(segment) ? segment : null;
};

const isProfileInSegment = (profile, segment) => {
  const isSuspended = !!profile.suspended_at;
  const isPremium = profile.is_premium === true;
  const isVerified = profile.is_verified === true;
  const isInvisiblePremium = isPremium && profile.is_invisible === true && !isSuspended;

  if (profile.is_admin === true) {
    return false;
  }

  switch (segment) {
    case 'ALL':
      return true;
    case 'ACTIVE':
      return !isSuspended;
    case 'SUSPENDED':
      return isSuspended;
    case 'VERIFIED':
      return isVerified && !isSuspended;
    case 'UNVERIFIED':
      return !isVerified && !isSuspended;
    case 'PREMIUM':
      return isPremium && !isSuspended;
    case 'FREE':
      return !isPremium && !isSuspended;
    case 'INVISIBLE_PREMIUM':
      return isInvisiblePremium;
    default:
      return false;
  }
};

const buildRecipientRows = (profiles, segment) => (profiles || []).filter((profile) => isProfileInSegment(profile, segment));
const normalizePlanId = (planId) => (planId || '').toString().toUpperCase();
const isInvisibleModeEligiblePlan = (planId) => INVISIBLE_MODE_PLAN_KEYS.includes(normalizePlanId(planId));

const listAllAuthUsers = async () => {
  const users = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const batch = data?.users || [];
    users.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }

  return users;
};

const buildProfileFromAuthUser = (authUser) => {
  const metadata = (authUser?.user_metadata && typeof authUser.user_metadata === 'object')
    ? authUser.user_metadata
    : {};
  const rawName = metadata.full_name || metadata.name || '';
  const derivedName = rawName || (authUser?.email ? authUser.email.split('@')[0] : 'Utilisateur');

  return {
    id: authUser.id,
    name: String(derivedName || 'Utilisateur').slice(0, 120),
    age: 18,
    gender: 'OTHER',
    bio: '',
    interests: [],
    target_gender: [],
    city: null,
    photos: [],
    is_verified: false,
    is_premium: false,
    is_invisible: false,
    is_admin: false,
    suspended_at: null,
  };
};

const paystackRequest = async (path, options = {}) => {
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.message || 'Paystack request failed';
    const error = new Error(message);
    error.payload = payload;
    throw error;
  }
  return payload;
};

const upsertSubscription = async ({ userId, planId, reference, status }) => {
  const normalizedPlanId = normalizePlanId(planId);
  const plan = PLAN_CONFIG[normalizedPlanId];
  const now = new Date();
  const currentPeriodEnd = plan ? new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000) : null;

  const { error: subError } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      provider: 'paystack',
      plan_id: normalizedPlanId,
      status,
      reference,
      current_period_end: currentPeriodEnd ? currentPeriodEnd.toISOString() : null,
    }, { onConflict: 'reference' });

  if (subError) {
    throw subError;
  }

  const isPremiumActive = status === 'active';
  const invisibleModeAllowed = isPremiumActive && isInvisibleModeEligiblePlan(normalizedPlanId);
  const profileUpdates = {
    is_premium: isPremiumActive,
    ...(invisibleModeAllowed ? {} : { is_invisible: false }),
  };

  const { error: profileError } = await supabase
    .from('profiles')
    .update(profileUpdates)
    .eq('id', userId);

  if (profileError) {
    throw profileError;
  }
};

const upsertBoost = async ({ userId, boostId, reference }) => {
  const boost = BOOST_CONFIG[boostId];
  const now = new Date();
  const boostedUntil = boost ? new Date(now.getTime() + boost.durationDays * 24 * 60 * 60 * 1000) : null;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ boosted_until: boostedUntil ? boostedUntil.toISOString() : null })
    .eq('id', userId);

  if (profileError) {
    throw profileError;
  }
};

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/api/payments/initialize', requireAuth, async (req, res) => {
  try {
    const { planId } = req.body || {};
    const planKey = normalizePlanId(planId || 'MONTHLY');
    const plan = PLAN_CONFIG[planKey];
    if (!plan) return res.status(400).json({ error: 'invalid_plan' });

    if (simulatePayments) {
      const reference = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      simulatedPayments.set(reference, { userId: req.user.id, planId: planKey });
      return res.json({
        authorization_url: PAYSTACK_CALLBACK_URL || 'https://example.com/simulated',
        reference,
        simulated: true,
      });
    }

    let email = req.user.email;
    if (!email) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(req.user.id);
      if (userError) {
        console.error(userError);
      }
      email = userData?.user?.email || '';
    }
    if (!email) return res.status(400).json({ error: 'missing_email' });

    const payload = {
      email,
      amount: plan.amount,
      currency: PAYSTACK_CURRENCY,
      callback_url: PAYSTACK_CALLBACK_URL || undefined,
      metadata: {
        user_id: req.user.id,
        plan_id: planKey,
      },
    };

    const data = await paystackRequest('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return res.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'paystack_initialize_failed' });
  }
});

app.post('/api/boosts/initialize', requireAuth, async (req, res) => {
  try {
    const { boostId } = req.body || {};
    const boostKey = boostId || 'DAILY';
    const boost = BOOST_CONFIG[boostKey];
    if (!boost) return res.status(400).json({ error: 'invalid_boost' });

    if (simulatePayments) {
      const reference = `sim_boost_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      simulatedPayments.set(reference, { userId: req.user.id, boostId: boostKey });
      return res.json({
        authorization_url: PAYSTACK_CALLBACK_URL || 'https://example.com/simulated',
        reference,
        simulated: true,
      });
    }

    let email = req.user.email;
    if (!email) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(req.user.id);
      if (userError) {
        console.error(userError);
      }
      email = userData?.user?.email || '';
    }
    if (!email) return res.status(400).json({ error: 'missing_email' });

    const payload = {
      email,
      amount: boost.amount,
      currency: PAYSTACK_CURRENCY,
      callback_url: PAYSTACK_CALLBACK_URL || undefined,
      metadata: {
        user_id: req.user.id,
        boost_id: boostKey,
        type: 'boost',
      },
    };

    const data = await paystackRequest('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return res.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'paystack_initialize_failed' });
  }
});

app.get('/api/payments/verify', requireAuth, async (req, res) => {
  try {
    const reference = req.query.reference;
    if (!reference) return res.status(400).json({ error: 'missing_reference' });

    if (simulatePayments) {
      const simulated = simulatedPayments.get(reference) || {};
      const planId = normalizePlanId(simulated.planId || 'MONTHLY');
      const userId = simulated.userId || req.user.id;
      await upsertSubscription({ userId, planId, reference, status: 'active' });
      return res.json({ status: 'active', reference, simulated: true });
    }

    const data = await paystackRequest(`/transaction/verify/${reference}`);
    const status = data.data.status === 'success' ? 'active' : data.data.status;
    const planId = normalizePlanId(data.data.metadata?.plan_id || 'MONTHLY');
    const userId = data.data.metadata?.user_id || req.user.id;

    if (status === 'active') {
      await upsertSubscription({ userId, planId, reference, status });
    }

    return res.json({ status, reference });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'paystack_verify_failed' });
  }
});

app.get('/api/boosts/verify', requireAuth, async (req, res) => {
  try {
    const reference = req.query.reference;
    if (!reference) return res.status(400).json({ error: 'missing_reference' });

    if (simulatePayments) {
      const simulated = simulatedPayments.get(reference) || {};
      const boostId = simulated.boostId || 'DAILY';
      const userId = simulated.userId || req.user.id;
      await upsertBoost({ userId, boostId, reference });
      return res.json({ status: 'active', reference, simulated: true });
    }

    const data = await paystackRequest(`/transaction/verify/${reference}`);
    const status = data.data.status === 'success' ? 'active' : data.data.status;
    const boostId = data.data.metadata?.boost_id || 'DAILY';
    const userId = data.data.metadata?.user_id || req.user.id;

    if (status === 'active') {
      await upsertBoost({ userId, boostId, reference });
    }

    return res.json({ status, reference });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'paystack_verify_failed' });
  }
});

app.post('/api/payments/webhook', async (req, res) => {
  if (simulatePayments) {
    return res.json({ received: true, simulated: true });
  }

  const signature = req.headers['x-paystack-signature'];
  if (!signature) return res.status(400).json({ error: 'missing_signature' });

  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(req.rawBody || JSON.stringify(req.body))
    .digest('hex');

  if (hash !== signature) return res.status(401).json({ error: 'invalid_signature' });

  const event = req.body;
  if (event?.event === 'charge.success') {
    const data = event.data || {};
    const status = data.status === 'success' ? 'active' : data.status;
    const planId = normalizePlanId(data.metadata?.plan_id);
    const boostId = data.metadata?.boost_id;
    const userId = data.metadata?.user_id;
    const reference = data.reference;

    if (userId && reference) {
      try {
        if (planId) {
          await upsertSubscription({ userId, planId, reference, status });
        } else if (boostId) {
          await upsertBoost({ userId, boostId, reference });
        }
      } catch (err) {
        console.error('Webhook upsert failed', err);
      }
    }
  }

  return res.json({ received: true });
});

app.post('/api/kyc/initialize', requireAuth, async (_req, res) => {
  if (KYC_PROVIDER === 'manual') {
    if (!KYC_VERIFICATION_URL) {
      return res.status(501).json({ error: 'kyc_not_configured' });
    }
    return res.json({ verification_url: KYC_VERIFICATION_URL });
  }

  return res.status(501).json({ error: 'kyc_provider_not_supported' });
});

app.get('/api/notifications/admin', requireAuth, async (req, res) => {
  const rawLimit = Number(req.query.limit ?? 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100)
    : 10;

  const { data, error } = await supabase
    .from('events')
    .select('id, event_name, metadata, created_at')
    .eq('user_id', req.user.id)
    .eq('event_type', 'ADMIN_MESSAGE')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const notifications = (data || []).map((item) => {
    const metadata = asObject(item.metadata);
    return {
      ...item,
      metadata,
      is_read: metadata.is_read === true,
    };
  });

  return res.json({
    notifications,
    unreadCount: notifications.filter((item) => item.is_read !== true).length,
  });
});

app.post('/api/notifications/admin/read-all', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('events')
    .select('id, metadata')
    .eq('user_id', req.user.id)
    .eq('event_type', 'ADMIN_MESSAGE')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const unread = (data || []).filter((row) => {
    const metadata = asObject(row.metadata);
    return metadata.is_read !== true;
  });

  if (unread.length === 0) {
    return res.json({ updated: 0 });
  }

  let updated = 0;
  for (const row of unread) {
    const metadata = asObject(row.metadata);
    const { error: updateError } = await supabase
      .from('events')
      .update({
        metadata: {
          ...metadata,
          is_read: true,
          read_at: new Date().toISOString(),
        },
      })
      .eq('id', row.id)
      .eq('user_id', req.user.id);

    if (!updateError) {
      updated += 1;
    }
  }

  return res.json({ updated });
});

app.post('/api/notifications/admin/:id/read', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'missing_notification_id' });

  const { data: row, error: fetchError } = await supabase
    .from('events')
    .select('id, metadata')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .eq('event_type', 'ADMIN_MESSAGE')
    .single();

  if (fetchError) {
    return res.status(404).json({ error: 'notification_not_found' });
  }

  const metadata = asObject(row.metadata);
  if (metadata.is_read === true) {
    return res.json({ updated: false });
  }

  const { error: updateError } = await supabase
    .from('events')
    .update({
      metadata: {
        ...metadata,
        is_read: true,
        read_at: new Date().toISOString(),
      },
    })
    .eq('id', id)
    .eq('user_id', req.user.id);

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  return res.json({ updated: true });
});

// Admin routes
const adminRouter = express.Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/users', async (_req, res) => {
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('*');
  if (profileError) return res.status(500).json({ error: profileError.message });

  let authUsers = [];
  try {
    authUsers = await listAllAuthUsers();
  } catch (error) {
    console.error('Failed to list auth users for admin /users endpoint:', error);
  }

  const emailById = new Map(authUsers.map((user) => [user.id, user.email || null]));
  const rows = (profiles || []).map((profile) => ({
    ...profile,
    email: emailById.get(profile.id) || null,
  }));

  return res.json(rows);
});

adminRouter.get('/messages/audience', async (req, res) => {
  const segment = normalizeSegment(req.query.segment);
  if (!segment) return res.status(400).json({ error: 'invalid_segment' });

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, is_verified, is_premium, is_invisible, is_admin, suspended_at');

  if (error) return res.status(500).json({ error: error.message });

  const recipientCount = buildRecipientRows(profiles, segment).length;
  return res.json({ segment, recipientCount });
});

adminRouter.post('/users/reconcile-profiles', async (_req, res) => {
  let authUsers = [];
  try {
    authUsers = await listAllAuthUsers();
  } catch (error) {
    console.error('Failed to list auth users for reconcile:', error);
    return res.status(500).json({ error: 'auth_users_list_failed' });
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id');
  if (profilesError) return res.status(500).json({ error: profilesError.message });

  const profileIds = new Set((profiles || []).map((profile) => profile.id));
  const missingAuthUsers = authUsers.filter((authUser) => !profileIds.has(authUser.id));

  if (missingAuthUsers.length === 0) {
    return res.json({
      createdCount: 0,
      missingBefore: 0,
      totalAuthUsers: authUsers.length,
      totalProfiles: profiles?.length || 0,
    });
  }

  const rows = missingAuthUsers.map(buildProfileFromAuthUser);
  const chunkSize = 500;
  let createdCount = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from('profiles').insert(chunk);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    createdCount += chunk.length;
  }

  return res.json({
    createdCount,
    missingBefore: missingAuthUsers.length,
    totalAuthUsers: authUsers.length,
    totalProfiles: (profiles?.length || 0) + createdCount,
  });
});

adminRouter.get('/stats', async (_req, res) => {
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, is_verified, is_premium, is_invisible, is_admin, suspended_at');

  if (profilesError) {
    return res.status(500).json({ error: profilesError.message });
  }

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from('subscriptions')
    .select('user_id, plan_id, status, current_period_end, updated_at, created_at')
    .eq('status', 'active');

  if (subscriptionsError) {
    return res.status(500).json({ error: subscriptionsError.message });
  }

  const nowIso = new Date().toISOString();
  const latestPlanByUserId = new Map();
  for (const sub of subscriptions || []) {
    if (sub.current_period_end && sub.current_period_end < nowIso) {
      continue;
    }
    const candidateTs = sub.current_period_end || sub.updated_at || sub.created_at || '';
    const current = latestPlanByUserId.get(sub.user_id);
    if (!current || candidateTs > current.timestamp) {
      latestPlanByUserId.set(sub.user_id, {
        planId: (sub.plan_id || '').toUpperCase(),
        timestamp: candidateTs,
      });
    }
  }

  const users = profiles || [];
  const total = users.length;
  const suspended = users.filter((u) => !!u.suspended_at).length;
  const active = total - suspended;
  const admins = users.filter((u) => u.is_admin === true).length;
  const verified = users.filter((u) => u.is_verified === true).length;
  const premium = users.filter((u) => u.is_premium === true).length;
  const free = users.filter((u) => u.is_premium !== true).length;
  const invisiblePremium = users.filter((u) => {
    if (!(u.is_premium === true && u.is_invisible === true && !u.suspended_at)) return false;
    const sub = latestPlanByUserId.get(u.id);
    return !!sub && isInvisibleModeEligiblePlan(sub.planId);
  }).length;

  const premiumByPlan = {
    MONTHLY: 0,
    QUARTERLY: 0,
    BIANNUAL: 0,
    ANNUAL: 0,
    UNKNOWN: 0,
  };

  for (const user of users) {
    if (user.is_premium !== true || !!user.suspended_at) continue;
    const sub = latestPlanByUserId.get(user.id);
    if (!sub || !PREMIUM_PLAN_KEYS.includes(sub.planId)) {
      premiumByPlan.UNKNOWN += 1;
      continue;
    }
    premiumByPlan[sub.planId] += 1;
  }

  let authUsersTotal = null;
  let authUsersWithoutProfile = null;
  try {
    const authUsers = await listAllAuthUsers();
    authUsersTotal = authUsers.length;
    const profileIds = new Set(users.map((user) => user.id));
    authUsersWithoutProfile = authUsers.filter((authUser) => !profileIds.has(authUser.id)).length;
  } catch (error) {
    console.error('Failed to list auth users for admin stats:', error);
  }

  return res.json({
    generatedAt: new Date().toISOString(),
    users: {
      total,
      active,
      suspended,
      admins,
      verified,
      unverified: total - verified,
      premium,
      free,
      invisiblePremium,
    },
    integrity: {
      authUsersTotal,
      profilesTotal: total,
      authUsersWithoutProfile,
    },
    premiumByPlan,
  });
});

adminRouter.put('/users/:id/suspend', async (req, res) => {
  const { id } = req.params;
  const { suspend } = req.body;
  if (!id) return res.status(400).json({ error: 'missing_user_id' });
  if (typeof suspend !== 'boolean') return res.status(400).json({ error: 'invalid_suspend_flag' });
  const suspended_at = suspend ? new Date().toISOString() : null;
  const { data, error } = await supabase
    .from('profiles')
    .update({ suspended_at })
    .eq('id', id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

adminRouter.post('/messages/broadcast', async (req, res) => {
  const segment = normalizeSegment(req.body?.segment);
  const title = (req.body?.title || '').toString().trim();
  const message = (req.body?.message || '').toString().trim();

  if (!segment) {
    return res.status(400).json({ error: 'invalid_segment' });
  }
  if (!message) {
    return res.status(400).json({ error: 'message_required' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: 'message_too_long' });
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, is_verified, is_premium, is_invisible, is_admin, suspended_at');

  if (profilesError) {
    return res.status(500).json({ error: profilesError.message });
  }

  const recipients = buildRecipientRows(profiles, segment);
  if (recipients.length === 0) {
    return res.json({
      recipientCount: 0,
      segment,
      sentAt: new Date().toISOString(),
    });
  }

  const sentAt = new Date().toISOString();
  const broadcastId = randomUUID();
  const rows = recipients.map((recipient) => ({
    user_id: recipient.id,
    event_type: 'ADMIN_MESSAGE',
    event_name: title || 'Information administrateur',
    metadata: {
      title: title || null,
      message,
      segment,
      broadcast_id: broadcastId,
      sent_by: req.user.id,
      sent_at: sentAt,
      is_read: false,
      read_at: null,
    },
  }));

  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from('events').insert(chunk);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.json({
    recipientCount: rows.length,
    segment,
    sentAt,
    broadcastId,
  });
});

adminRouter.get('/messages/history', async (req, res) => {
  const rawLimit = Number(req.query.limit ?? 20);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100)
    : 20;

  const { data, error } = await supabase
    .from('events')
    .select('id, event_name, metadata, created_at')
    .eq('event_type', 'ADMIN_MESSAGE')
    .order('created_at', { ascending: false })
    .limit(limit * 200);

  if (error) return res.status(500).json({ error: error.message });

  const rows = (data || []).filter((row) => {
    const metadata = asObject(row.metadata);
    return metadata.sent_by === req.user.id;
  });

  const campaignsById = new Map();
  for (const row of rows) {
    const metadata = asObject(row.metadata);
    const sentAt = (metadata.sent_at || row.created_at || '').toString();
    const groupId = (metadata.broadcast_id || `${metadata.sent_by || ''}:${sentAt}:${row.event_name || ''}:${metadata.segment || ''}`).toString();

    const current = campaignsById.get(groupId);
    if (!current) {
      campaignsById.set(groupId, {
        campaignId: groupId,
        title: metadata.title || row.event_name || 'Information administrateur',
        message: metadata.message || '',
        segment: metadata.segment || 'ALL',
        sentAt,
        recipientCount: 1,
        readCount: metadata.is_read === true ? 1 : 0,
      });
      continue;
    }

    current.recipientCount += 1;
    if (metadata.is_read === true) current.readCount += 1;
  }

  const campaigns = Array.from(campaignsById.values())
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
    .slice(0, limit);

  return res.json({ campaigns });
});

app.use('/api/admin', adminRouter);

app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'invalid_json' });
  }
  console.error('Unhandled server error:', err);
  return res.status(500).json({ error: 'internal_server_error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Yamo server running on http://0.0.0.0:${PORT}`);
});
