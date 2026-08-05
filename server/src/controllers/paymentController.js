const axios = require('axios');
const crypto = require('crypto');
const { getExpectedAmountForPurchase, extractPaystackError, shouldFallbackFromMobileMoney } = require('../utils/paymentHelpers');
const {
  applyPurchasedEntitlement,
  verifyGooglePlayPurchase,
  verifyApplePurchase
} = require('../services/subscriptionService');

const initializePayment = async (req, res) => {
  const { planId, type, targetId, paymentMethod, note, callbackUrl } = req.body;
  const email = req.authUser?.email || `${req.user.id}@galant.app`;
  const normalizedType = String(type || '').toUpperCase();
  const normalizedPlanId = String(planId || '').toUpperCase();
  const requestedPaymentMethod = String(paymentMethod || 'CARD_MOBILE_MONEY').toUpperCase();
  const normalizedPaymentMethod = ['CARD', 'MOBILE_MONEY', 'CARD_MOBILE_MONEY'].includes(requestedPaymentMethod)
    ? requestedPaymentMethod
    : 'CARD_MOBILE_MONEY';
  const expectedAmount = await getExpectedAmountForPurchase({ type: normalizedType, planId: normalizedPlanId });
  const roundedAmount = Math.round(Number(expectedAmount || 0) * 100);

  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  const configuredCallbackUrl = process.env.PAYSTACK_CALLBACK_URL || 'galant://payment-callback';
  const requestedCallbackUrl = String(callbackUrl || '').trim();
  const requestOrigin = String(req.get('origin') || '').replace(/\/$/, '');
  let PAYSTACK_CALLBACK_URL = configuredCallbackUrl;

  try {
    const parsedCallbackUrl = new URL(requestedCallbackUrl);
    const callbackOrigin = `${parsedCallbackUrl.protocol}//${parsedCallbackUrl.host}`;
    const isMobileDeepLink = parsedCallbackUrl.protocol === 'galant:';
    const isSameWebOrigin = ['http:', 'https:'].includes(parsedCallbackUrl.protocol) && requestOrigin && callbackOrigin === requestOrigin;
    if (isMobileDeepLink || isSameWebOrigin) {
      PAYSTACK_CALLBACK_URL = requestedCallbackUrl;
    }
  } catch (_) {
    PAYSTACK_CALLBACK_URL = configuredCallbackUrl;
  }

  if (!PAYSTACK_SECRET_KEY) return res.status(500).json({ error: 'paystack_not_configured' });
  if (!Number.isFinite(roundedAmount) || roundedAmount <= 0 || expectedAmount === null) {
    return res.status(400).json({ error: 'invalid_purchase_payload' });
  }

  const payload = {
    email,
    amount: roundedAmount,
    currency: 'XOF',
    callback_url: PAYSTACK_CALLBACK_URL,
    metadata: {
      userId: req.user.id,
      planId: normalizedPlanId || null,
      type: normalizedType,
      targetId: targetId || null,
      paymentMethod: normalizedPaymentMethod,
      note: note || null,
    },
  };

  if (normalizedPaymentMethod === 'CARD') {
    payload.channels = ['card'];
  } else if (normalizedPaymentMethod === 'MOBILE_MONEY') {
    payload.channels = ['mobile_money'];
  } else {
    payload.channels = ['card', 'mobile_money'];
  }

  try {
    const response = await axios.post('https://api.paystack.co/transaction/initialize', payload, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    return res.json(response.data.data);
  } catch (error) {
    if (normalizedPaymentMethod === 'MOBILE_MONEY' && shouldFallbackFromMobileMoney(error)) {
      try {
        const fallbackPayload = { ...payload };
        delete fallbackPayload.channels;
        const fallbackResponse = await axios.post('https://api.paystack.co/transaction/initialize', fallbackPayload, {
          headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
        });
        return res.json(fallbackResponse.data.data);
      } catch (fallbackError) {
        return res.status(500).json({ error: extractPaystackError(fallbackError), code: 'paystack_init_failed' });
      }
    }
    return res.status(500).json({ error: extractPaystackError(error), code: 'paystack_init_failed' });
  }
};

const verifyPayment = async (req, res) => {
  const { reference } = req.query;
  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  try {
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
    });
    const data = response.data.data;
    if (data.status === 'success') {
      const { userId, planId, type, targetId, note, paymentMethod } = data.metadata || {};
      if (!userId || userId !== req.user.id) return res.status(403).json({ error: 'payment_user_mismatch' });

      await applyPurchasedEntitlement({
        userId,
        planId,
        type,
        targetId,
        reference,
        paymentMethod: paymentMethod ? `PAYSTACK_${paymentMethod}` : 'PAYSTACK',
        note
      });
      return res.json({ status: 'active', reference });
    }
    res.json({ status: data.status });
  } catch (e) {
    res.status(500).json({ error: 'paystack_verify_failed' });
  }
};

const handleWebhook = async (req, res) => {
  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

  // Verify signature
  const hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(JSON.stringify(req.body)).digest('hex');
  if (hash !== req.headers['x-paystack-signature']) {
    return res.sendStatus(400);
  }

  const event = req.body;
  if (event.event === 'charge.success') {
    const data = event.data;
    const { userId, planId, type, targetId, note, paymentMethod } = data.metadata || {};
    const reference = data.reference;

    if (userId) {
      try {
        await applyPurchasedEntitlement({
          userId,
          planId,
          type,
          targetId,
          reference,
          paymentMethod: paymentMethod ? `PAYSTACK_WEBHOOK_${paymentMethod}` : 'PAYSTACK_WEBHOOK',
          note
        });
        console.log(`✅ Webhook processed successfully for user ${userId}, reference ${reference}`);
      } catch (error) {
        console.error('❌ Error processing webhook entitlement:', error.message);
      }
    }
  }

  res.sendStatus(200);
};

const googleVerify = async (req, res) => {
  const { purchaseToken, productId, planId, type, targetId } = req.body;
  const userId = req.user.id;
  const normalizedType = String(type || '').toUpperCase();
  const normalizedPlanId = String(planId || '').toUpperCase();
  const safeReference = String(purchaseToken || '');

  try {
    if (!purchaseToken || !productId) {
      return res.status(400).json({ error: 'missing_google_purchase_payload' });
    }

    const verification = await verifyGooglePlayPurchase({ productId, purchaseToken });
    if (!verification.valid) {
      return res.status(400).json({ error: 'invalid_google_purchase', reason: verification.reason || 'verification_failed' });
    }

    await applyPurchasedEntitlement({
      userId,
      planId: normalizedPlanId,
      type: normalizedType || (String(productId).includes('premium') ? 'PREMIUM' : ''),
      targetId,
      reference: safeReference,
      paymentMethod: 'GOOGLE_PLAY',
      purchaseMeta: {
        productId,
        purchaseToken,
        autoRenewing: verification.autoRenewing,
      },
    });

    res.json({ status: 'success' });
  } catch (e) {
    res.status(500).json({ error: 'google_verify_failed', detail: String(e?.message || e) });
  }
};

const appleVerify = async (req, res) => {
  const { transactionId, productId, planId, type, targetId } = req.body;
  const userId = req.user.id;
  const normalizedType = String(type || '').toUpperCase();
  const normalizedPlanId = String(planId || '').toUpperCase();
  const safeReference = String(transactionId || '');

  try {
    const verification = await verifyApplePurchase({ transactionId });
    if (!verification.valid) {
      return res.status(400).json({ error: 'invalid_apple_purchase', reason: verification.reason || 'verification_failed' });
    }

    await applyPurchasedEntitlement({
      userId,
      planId: normalizedPlanId,
      type: normalizedType,
      targetId,
      reference: safeReference,
      paymentMethod: 'APPLE_STORE',
      purchaseMeta: {
        productId,
        transactionId,
        autoRenewing: null, // Basic implementation
      },
    });

    res.json({ status: 'success' });
  } catch (e) {
    res.status(500).json({ error: 'apple_verify_failed', detail: String(e?.message || e) });
  }
};

module.exports = { initializePayment, verifyPayment, googleVerify, appleVerify, handleWebhook };
