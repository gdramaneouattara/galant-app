const axios = require('axios');
const crypto = require('crypto');
const { db } = require('../config/firebase');
const { getExpectedAmountForPurchase, extractPaystackError, shouldFallbackFromMobileMoney } = require('../utils/paymentHelpers');
const {
  applyPurchasedEntitlement,
  verifyGooglePlayPurchase,
  verifyApplePurchase
} = require('../services/subscriptionService');
const { getCurrentPricing } = require('../services/pricingService');

const getPaymentPricing = async (req, res) => {
  try {
    const pricing = await getCurrentPricing();
    res.json(pricing);
  } catch (error) {
    res.status(500).json({ error: 'pricing_unavailable' });
  }
};

const MANUAL_PAYMENTS_COLLECTION = 'manual_payments';
const WAVE_PROVIDER = 'WAVE_MANUAL';

const normalizePaymentText = (value = '') => String(value || '').trim();
const normalizeTransactionId = (value = '') => normalizePaymentText(value).replace(/\s+/g, '').toUpperCase();
const normalizeManualReference = (value = '') => normalizePaymentText(value).replace(/\s+/g, '').toUpperCase();

const getManualPaymentExpiryMinutes = () => {
  const value = Number(process.env.WAVE_MANUAL_PAYMENT_EXPIRES_MINUTES || 60);
  if (!Number.isFinite(value)) return 60;
  return Math.max(10, Math.min(240, Math.round(value)));
};

const validateQuotedAmount = async ({ type, planId, amount }) => {
  const normalizedType = String(type || '').toUpperCase();
  const normalizedPlanId = String(planId || '').toUpperCase();
  const expectedAmount = await getExpectedAmountForPurchase({
    type: normalizedType,
    planId: normalizedPlanId,
    forceRefresh: true
  });
  const displayedAmount = Number(amount);
  const normalizedDisplayedAmount = Math.round(displayedAmount);
  const normalizedExpectedAmount = Math.round(Number(expectedAmount));

  if (!expectedAmount || !Number.isFinite(normalizedExpectedAmount) || normalizedExpectedAmount <= 0) {
    return { error: 'invalid_purchase_payload' };
  }
  if (amount === undefined || amount === null) {
    return { error: 'missing_quoted_amount' };
  }
  if (!Number.isFinite(normalizedDisplayedAmount) || normalizedDisplayedAmount <= 0) {
    return { error: 'invalid_quoted_amount' };
  }
  if (normalizedDisplayedAmount !== normalizedExpectedAmount) {
    return {
      error: 'price_changed',
      quoted_amount: normalizedDisplayedAmount,
      expected_amount: normalizedExpectedAmount,
      message: 'Le prix de cette offre a change. Veuillez rafraichir le Store avant de payer.'
    };
  }

  return {
    normalizedType,
    normalizedPlanId,
    amount: normalizedExpectedAmount
  };
};

const createWaveReference = async () => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const reference = `GAL-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const existing = await db.collection(MANUAL_PAYMENTS_COLLECTION).doc(reference).get();
    if (!existing.exists) return reference;
  }
  throw new Error('manual_reference_generation_failed');
};

const createWaveManualPayment = async (req, res) => {
  const { planId, type, targetId, note, amount } = req.body;
  const wavePaymentLink = normalizePaymentText(process.env.WAVE_PAYMENT_LINK || process.env.WAVE_MANUAL_PAYMENT_LINK);
  if (!wavePaymentLink) {
    return res.status(500).json({ error: 'wave_payment_link_not_configured' });
  }

  try {
    const quote = await validateQuotedAmount({ type, planId, amount });
    if (quote.error) return res.status(quote.error === 'price_changed' ? 409 : 400).json(quote);

    const referenceCode = await createWaveReference();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + getManualPaymentExpiryMinutes() * 60 * 1000);
    const payload = {
      reference_code: referenceCode,
      user_id: req.user.id,
      user_email: req.authUser?.email || null,
      plan_id: quote.normalizedPlanId || null,
      type: quote.normalizedType,
      target_id: targetId || null,
      note: note || null,
      amount: quote.amount,
      currency: 'XOF',
      provider: WAVE_PROVIDER,
      status: 'PENDING',
      payment_link: wavePaymentLink,
      receiver_name: normalizePaymentText(process.env.WAVE_RECEIVER_NAME || ''),
      receiver_phone: normalizePaymentText(process.env.WAVE_RECEIVER_PHONE || ''),
      transaction_id: null,
      transaction_id_normalized: null,
      payer_phone: null,
      submitted_at: null,
      approved_at: null,
      approved_by: null,
      rejected_at: null,
      rejected_by: null,
      admin_note: null,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    await db.collection(MANUAL_PAYMENTS_COLLECTION).doc(referenceCode).set(payload);

    return res.status(201).json({
      status: 'PENDING',
      reference_code: referenceCode,
      amount: quote.amount,
      currency: 'XOF',
      payment_link: wavePaymentLink,
      receiver_name: payload.receiver_name || null,
      receiver_phone: payload.receiver_phone || null,
      expires_at: payload.expires_at,
      instructions: [
        'Payez le montant exact via le lien Wave.',
        'Ajoutez le code de reference dans le libelle si Wave le permet.',
        'Renseignez ensuite l ID transaction Wave dans Galant.',
        'Votre achat sera debloque uniquement apres validation admin.'
      ]
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'wave_manual_payment_failed' });
  }
};

const submitWaveManualPaymentProof = async (req, res) => {
  const referenceCode = normalizeManualReference(req.body.referenceCode || req.body.reference_code);
  const transactionId = normalizePaymentText(req.body.transactionId || req.body.transaction_id);
  const transactionIdNormalized = normalizeTransactionId(transactionId);
  const payerPhone = normalizePaymentText(req.body.phone || req.body.payer_phone);

  if (!referenceCode || !transactionIdNormalized || !payerPhone) {
    return res.status(400).json({ error: 'missing_wave_transaction_payload' });
  }

  try {
    const ref = db.collection(MANUAL_PAYMENTS_COLLECTION).doc(referenceCode);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'manual_payment_not_found' });

    const payment = doc.data() || {};
    if (payment.user_id !== req.user.id) return res.status(403).json({ error: 'manual_payment_user_mismatch' });
    if (['APPROVED', 'REJECTED'].includes(payment.status)) {
      return res.status(409).json({ error: 'manual_payment_closed', status: payment.status });
    }
    if (payment.expires_at && new Date(payment.expires_at).getTime() < Date.now()) {
      await ref.update({ status: 'EXPIRED', updated_at: new Date().toISOString() });
      return res.status(410).json({ error: 'manual_payment_expired' });
    }

    const duplicate = await db.collection(MANUAL_PAYMENTS_COLLECTION)
      .where('transaction_id_normalized', '==', transactionIdNormalized)
      .limit(2)
      .get();
    const duplicateDoc = duplicate.docs.find(item => item.id !== referenceCode);
    if (duplicateDoc) {
      return res.status(409).json({ error: 'wave_transaction_already_used' });
    }

    await ref.update({
      status: 'SUBMITTED',
      transaction_id: transactionId,
      transaction_id_normalized: transactionIdNormalized,
      payer_phone: payerPhone,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    return res.json({
      status: 'SUBMITTED',
      reference_code: referenceCode,
      message: 'Paiement recu pour verification admin.'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'wave_manual_submit_failed' });
  }
};

const listWaveManualPayments = async (req, res) => {
  const status = String(req.query.status || 'OPEN').toUpperCase();
  const limit = Math.max(1, Math.min(200, parseInt(req.query.limit || '80', 10)));
  const openStatuses = new Set(['PENDING', 'SUBMITTED']);

  try {
    const snapshot = await db.collection(MANUAL_PAYMENTS_COLLECTION).limit(300).get();
    const payments = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(item => {
        if (status === 'ALL') return true;
        if (status === 'OPEN') return openStatuses.has(item.status);
        return item.status === status;
      })
      .sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || '')))
      .slice(0, limit);

    const userIds = [...new Set(payments.map(item => item.user_id).filter(Boolean))].slice(0, 80);
    const profiles = {};
    await Promise.all(userIds.map(async (userId) => {
      try {
        const profileDoc = await db.collection('profiles').doc(userId).get();
        if (profileDoc.exists) profiles[userId] = { id: profileDoc.id, ...profileDoc.data() };
      } catch (_) {}
    }));

    res.json({
      payments: payments.map(item => ({
        ...item,
        profile: profiles[item.user_id] ? {
          id: profiles[item.user_id].id,
          name: profiles[item.user_id].name || null,
          phone: profiles[item.user_id].phone || null,
          city: profiles[item.user_id].city || null
        } : null
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'wave_manual_list_failed' });
  }
};

const approveWaveManualPayment = async (req, res) => {
  const referenceCode = normalizeManualReference(req.params.referenceCode);
  const adminNote = normalizePaymentText(req.body.adminNote || req.body.admin_note);

  try {
    const ref = db.collection(MANUAL_PAYMENTS_COLLECTION).doc(referenceCode);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'manual_payment_not_found' });
    const payment = doc.data() || {};

    if (payment.status === 'APPROVED') return res.json({ success: true, status: 'APPROVED', already_approved: true });
    if (payment.status === 'REJECTED') return res.status(409).json({ error: 'manual_payment_rejected' });
    if (!payment.transaction_id_normalized) return res.status(400).json({ error: 'missing_wave_transaction_id' });

    const duplicateApproved = await db.collection(MANUAL_PAYMENTS_COLLECTION)
      .where('transaction_id_normalized', '==', payment.transaction_id_normalized)
      .limit(5)
      .get();
    const alreadyApprovedElsewhere = duplicateApproved.docs
      .some(item => item.id !== referenceCode && item.data()?.status === 'APPROVED');
    if (alreadyApprovedElsewhere) {
      return res.status(409).json({ error: 'wave_transaction_already_approved' });
    }

    await applyPurchasedEntitlement({
      userId: payment.user_id,
      planId: payment.plan_id,
      type: payment.type,
      targetId: payment.target_id,
      reference: `wave_${referenceCode}`,
      paymentMethod: WAVE_PROVIDER,
      note: payment.note || null,
      purchaseMeta: {
        manualReference: referenceCode,
        transactionId: payment.transaction_id,
        payerPhone: payment.payer_phone || null
      }
    });

    await ref.update({
      status: 'APPROVED',
      approved_at: new Date().toISOString(),
      approved_by: req.user.id,
      admin_note: adminNote || null,
      updated_at: new Date().toISOString()
    });

    return res.json({ success: true, status: 'APPROVED' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'wave_manual_approve_failed' });
  }
};

const rejectWaveManualPayment = async (req, res) => {
  const referenceCode = normalizeManualReference(req.params.referenceCode);
  const adminNote = normalizePaymentText(req.body.adminNote || req.body.admin_note);

  try {
    const ref = db.collection(MANUAL_PAYMENTS_COLLECTION).doc(referenceCode);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'manual_payment_not_found' });
    const payment = doc.data() || {};
    if (payment.status === 'APPROVED') return res.status(409).json({ error: 'manual_payment_already_approved' });

    await ref.update({
      status: 'REJECTED',
      rejected_at: new Date().toISOString(),
      rejected_by: req.user.id,
      admin_note: adminNote || null,
      updated_at: new Date().toISOString()
    });

    return res.json({ success: true, status: 'REJECTED' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'wave_manual_reject_failed' });
  }
};

const initializePayment = async (req, res) => {
  const { planId, type, targetId, paymentMethod, note, callbackUrl, amount } = req.body;
  const email = req.authUser?.email || `${req.user.id}@galant.app`;
  const normalizedType = String(type || '').toUpperCase();
  const normalizedPlanId = String(planId || '').toUpperCase();
  const requestedPaymentMethod = String(paymentMethod || 'CARD_MOBILE_MONEY').toUpperCase();
  const normalizedPaymentMethod = ['CARD', 'MOBILE_MONEY', 'CARD_MOBILE_MONEY'].includes(requestedPaymentMethod)
    ? requestedPaymentMethod
    : 'CARD_MOBILE_MONEY';
  const expectedAmount = await getExpectedAmountForPurchase({ type: normalizedType, planId: normalizedPlanId, forceRefresh: true });
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
  if (amount === undefined || amount === null) {
    return res.status(400).json({ error: 'missing_quoted_amount' });
  }
  const displayedAmount = Number(amount);
  const normalizedDisplayedAmount = Math.round(displayedAmount);
  const normalizedExpectedAmount = Math.round(Number(expectedAmount));
  if (!Number.isFinite(normalizedDisplayedAmount) || normalizedDisplayedAmount <= 0) {
    return res.status(400).json({ error: 'invalid_quoted_amount' });
  }
  if (normalizedDisplayedAmount !== normalizedExpectedAmount) {
    return res.status(409).json({
      error: 'price_changed',
      quoted_amount: normalizedDisplayedAmount,
      expected_amount: normalizedExpectedAmount,
      message: 'Le prix de cette offre a change. Veuillez rafraichir le Store avant de payer.'
    });
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
      quotedAmount: normalizedDisplayedAmount,
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

module.exports = {
  getPaymentPricing,
  createWaveManualPayment,
  submitWaveManualPaymentProof,
  listWaveManualPayments,
  approveWaveManualPayment,
  rejectWaveManualPayment,
  initializePayment,
  verifyPayment,
  googleVerify,
  appleVerify,
  handleWebhook
};
