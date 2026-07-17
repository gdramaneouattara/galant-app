const axios = require('axios');
const { supabase } = require('../config/supabase');
const { getExpectedAmountForPurchase, extractPaystackError, shouldFallbackFromMobileMoney } = require('../utils/paymentHelpers');
const {
  applyPurchasedEntitlement,
  verifyGooglePlayPurchase,
  verifyApplePurchase
} = require('../services/subscriptionService');

const initializePayment = async (req, res) => {
  const { planId, type, targetId, paymentMethod, note } = req.body;
  const email = req.authUser.email || `${req.user.id}@galant.app`;
  const normalizedType = String(type || '').toUpperCase();
  const normalizedPlanId = String(planId || '').toUpperCase();
  const normalizedPaymentMethod = String(paymentMethod || 'CARD').toUpperCase();
  const expectedAmount = getExpectedAmountForPurchase({ type: normalizedType, planId: normalizedPlanId });
  const roundedAmount = Math.round(Number(expectedAmount || 0) * 100);

  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  const PAYSTACK_CALLBACK_URL = process.env.PAYSTACK_CALLBACK_URL || 'galant://payment-callback';

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

  if (normalizedPaymentMethod === 'MOBILE_MONEY') {
    payload.channels = ['mobile_money'];
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
      const { userId, planId, type, targetId, note } = data.metadata || {};
      if (!userId || userId !== req.user.id) return res.status(403).json({ error: 'payment_user_mismatch' });

      await applyPurchasedEntitlement({ userId, planId, type, targetId, reference, paymentMethod: 'PAYSTACK', note });
      return res.json({ status: 'active', reference });
    }
    res.json({ status: data.status });
  } catch (e) {
    res.status(500).json({ error: 'paystack_verify_failed' });
  }
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

module.exports = { initializePayment, verifyPayment, googleVerify, appleVerify };
