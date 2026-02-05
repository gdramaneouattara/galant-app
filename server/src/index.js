const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
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
  SUPABASE_JWT_SECRET,
  PAYSTACK_SECRET_KEY,
  PAYSTACK_CURRENCY = 'XOF',
  PAYSTACK_CALLBACK_URL,
  PLAN_MONTHLY_AMOUNT = '300000',
  PLAN_QUARTERLY_AMOUNT = '900000',
  PLAN_BIANNUAL_AMOUNT = '1500000',
  PLAN_ANNUAL_AMOUNT = '3000000',
  KYC_PROVIDER = 'manual',
  KYC_VERIFICATION_URL = '',
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_JWT_SECRET) {
  throw new Error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_JWT_SECRET');
}
if (!PAYSTACK_SECRET_KEY) {
  throw new Error('Missing PAYSTACK_SECRET_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const PLAN_CONFIG = {
  MONTHLY: { amount: Number(PLAN_MONTHLY_AMOUNT), durationDays: 30 },
  QUARTERLY: { amount: Number(PLAN_QUARTERLY_AMOUNT), durationDays: 90 },
  BIANNUAL: { amount: Number(PLAN_BIANNUAL_AMOUNT), durationDays: 180 },
  ANNUAL: { amount: Number(PLAN_ANNUAL_AMOUNT), durationDays: 365 },
};

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_token' });
  try {
    const payload = jwt.verify(token, SUPABASE_JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email || payload.user_metadata?.email || '' };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid_token' });
  }
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
  const plan = PLAN_CONFIG[planId];
  const now = new Date();
  const currentPeriodEnd = plan ? new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000) : null;

  const { error: subError } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      provider: 'paystack',
      plan_id: planId,
      status,
      reference,
      current_period_end: currentPeriodEnd ? currentPeriodEnd.toISOString() : null,
    }, { onConflict: 'reference' });

  if (subError) {
    throw subError;
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ is_premium: status === 'active' })
    .eq('id', userId);

  if (profileError) {
    throw profileError;
  }
};

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/api/payments/initialize', requireAuth, async (req, res) => {
  try {
    const { planId } = req.body || {};
    const planKey = planId || 'MONTHLY';
    const plan = PLAN_CONFIG[planKey];
    if (!plan) return res.status(400).json({ error: 'invalid_plan' });

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

app.get('/api/payments/verify', requireAuth, async (req, res) => {
  try {
    const reference = req.query.reference;
    if (!reference) return res.status(400).json({ error: 'missing_reference' });

    const data = await paystackRequest(`/transaction/verify/${reference}`);
    const status = data.data.status === 'success' ? 'active' : data.data.status;
    const planId = data.data.metadata?.plan_id || 'MONTHLY';
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

app.post('/api/payments/webhook', async (req, res) => {
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
    const planId = data.metadata?.plan_id || 'MONTHLY';
    const userId = data.metadata?.user_id;
    const reference = data.reference;
    if (userId && reference) {
      try {
        await upsertSubscription({ userId, planId, reference, status });
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

app.listen(PORT, () => {
  console.log(`YAMO server running on http://localhost:${PORT}`);
});
