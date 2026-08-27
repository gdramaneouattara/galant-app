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
const { createInternalNotification, NOTIFICATION_TYPES } = require('../services/notificationCenterService');

const getPaymentPricing = async (req, res) => {
  try {
    const pricing = await getCurrentPricing();
    res.json(pricing);
  } catch (error) {
    res.status(500).json({ error: 'pricing_unavailable' });
  }
};

const MANUAL_PAYMENTS_COLLECTION = 'manual_payments';
const MANUAL_PAYMENT_TRANSACTION_CLAIMS_COLLECTION = 'manual_payment_transaction_claims';
const WAVE_PROVIDER = 'WAVE_MANUAL';

const createPaymentNotificationSafely = async (payload) => {
  try {
    return await createInternalNotification(payload);
  } catch (error) {
    console.warn('[payment] notification_failed', error.message);
    return null;
  }
};

const normalizePaymentText = (value = '') => String(value || '').trim();
const normalizeTransactionId = (value = '') => normalizePaymentText(value).replace(/\s+/g, '').toUpperCase();
const normalizeManualReference = (value = '') => normalizePaymentText(value).replace(/\s+/g, '').toUpperCase();
const hashFirestoreId = (value = '') => crypto.createHash('sha256').update(normalizePaymentText(value)).digest('hex');
const createApprovalLeaseId = () => crypto.randomBytes(12).toString('hex');
const hasPaystackSecret = () => !!process.env.PAYSTACK_SECRET_KEY;
const isPaystackInitializationEnabled = () => {
  const enabled = String(process.env.PAYSTACK_ENABLED || 'false').toLowerCase() === 'true';
  return enabled && hasPaystackSecret();
};

const paystackDisabledPayload = {
  error: 'paystack_disabled',
  message: 'Le paiement Paystack est temporairement desactive. Utilisez le paiement Wave.'
};
const paystackUnavailablePayload = {
  error: 'paystack_unavailable',
  message: 'Paystack est indisponible pour verifier cet ancien paiement.'
};

const getManualPaymentExpiryMinutes = () => {
  const value = Number(process.env.WAVE_MANUAL_PAYMENT_EXPIRES_MINUTES || 300);
  if (!Number.isFinite(value)) return 300;
  return Math.max(10, Math.min(300, Math.round(value)));
};

const getManualPaymentProcessingTimeoutMs = () => {
  const value = Number(process.env.WAVE_MANUAL_PAYMENT_PROCESSING_TIMEOUT_MINUTES || 10);
  const minutes = Number.isFinite(value) ? Math.max(5, Math.min(60, Math.round(value))) : 10;
  return minutes * 60 * 1000;
};

const isManualPaymentProcessingStale = (payment = {}, claim = {}) => {
  const candidate = claim.claimed_at || claim.updated_at || payment.approval_claimed_at || payment.updated_at;
  const timestamp = candidate ? new Date(candidate).getTime() : 0;
  return !timestamp || Date.now() - timestamp > getManualPaymentProcessingTimeoutMs();
};

const isManualPaymentExpired = (payment = {}, nowMs = Date.now()) => {
  if (!payment.expires_at) return false;
  const expiresAtMs = new Date(payment.expires_at).getTime();
  return Number.isFinite(expiresAtMs) && expiresAtMs < nowMs;
};

const getOpenPaymentPriority = (payment = {}) => {
  const priorities = {
    SUBMITTED: 0,
    PROCESSING: 1,
    PENDING: 2
  };
  return priorities[payment.status] ?? 99;
};

const sortOldestFirst = (left = {}, right = {}) => (
  String(left.created_at || '').localeCompare(String(right.created_at || ''))
);

const sortOpenPaymentsForAdmin = (left = {}, right = {}) => {
  const priorityDelta = getOpenPaymentPriority(left) - getOpenPaymentPriority(right);
  if (priorityDelta !== 0) return priorityDelta;
  return sortOldestFirst(left, right);
};

const fetchManualPaymentsByStatus = async (itemStatus, queryLimit) => {
  return db.collection(MANUAL_PAYMENTS_COLLECTION)
    .where('status', '==', itemStatus)
    .orderBy('created_at', 'asc')
    .limit(queryLimit)
    .get();
};

const fetchOpenPendingManualPayments = async (queryLimit) => {
  const collected = [];
  const nowMs = Date.now();
  const pageSize = Math.min(100, Math.max(20, queryLimit));
  const maxScanned = Math.min(1500, Math.max(queryLimit * 8, queryLimit));
  let scanned = 0;
  let lastDoc = null;

  while (collected.length < queryLimit && scanned < maxScanned) {
    const batchLimit = Math.min(pageSize, maxScanned - scanned);
    let query = db.collection(MANUAL_PAYMENTS_COLLECTION)
      .where('status', '==', 'PENDING')
      .orderBy('created_at', 'asc')
      .limit(batchLimit);

    if (lastDoc) query = query.startAfter(lastDoc);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    scanned += snapshot.docs.length;
    for (const doc of snapshot.docs) {
      const payment = { id: doc.id, ...doc.data() };
      if (!isManualPaymentExpired(payment, nowMs)) {
        collected.push(payment);
        if (collected.length >= queryLimit) break;
      }
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.docs.length < batchLimit) break;
  }

  return collected;
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

  try {
    const queryLimit = Math.min(300, Math.max(limit * 3, limit));
    const snapshots = status === 'OPEN'
      ? await Promise.all(['SUBMITTED', 'PROCESSING'].map(itemStatus => fetchManualPaymentsByStatus(itemStatus, queryLimit)))
      : status === 'ALL'
        ? [await db.collection(MANUAL_PAYMENTS_COLLECTION)
          .orderBy('created_at', 'asc')
          .limit(queryLimit)
          .get()]
        : [await fetchManualPaymentsByStatus(status, queryLimit)];
    const pendingPayments = status === 'OPEN' ? await fetchOpenPendingManualPayments(queryLimit) : [];
    const payments = [
      ...snapshots.flatMap(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      ...pendingPayments
    ]
      .sort(status === 'OPEN' ? sortOpenPaymentsForAdmin : sortOldestFirst)
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
    const now = new Date().toISOString();
    const approvalLeaseId = createApprovalLeaseId();
    const claim = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(ref);
      if (!doc.exists) return { error: 'manual_payment_not_found', statusCode: 404 };
      const payment = doc.data() || {};

      if (payment.status === 'APPROVED') return { alreadyApproved: true };
      if (payment.status === 'REJECTED') return { error: 'manual_payment_rejected', statusCode: 409 };
      if (!payment.transaction_id_normalized) return { error: 'missing_wave_transaction_id', statusCode: 400 };
      if (!payment.payer_phone) return { error: 'missing_wave_payer_phone', statusCode: 400 };

      const claimId = hashFirestoreId(payment.transaction_id_normalized);
      const claimRef = db.collection(MANUAL_PAYMENT_TRANSACTION_CLAIMS_COLLECTION).doc(claimId);
      const claimDoc = await transaction.get(claimRef);
      if (claimDoc.exists) {
        const claimData = claimDoc.data() || {};
        if (claimData.reference_code !== referenceCode) {
          return { error: 'wave_transaction_already_claimed', statusCode: 409 };
        }
        if (claimData.status === 'APPROVED' || claimData.status === 'ENTITLEMENT_APPLIED') {
          transaction.update(ref, {
            status: 'APPROVED',
            approved_at: claimData.approved_at || claimData.entitlement_applied_at || now,
            approved_by: claimData.approved_by || req.user.id,
            admin_note: adminNote || payment.admin_note || null,
            updated_at: now
          });
          return { alreadyApproved: true };
        }
        if (claimData.status === 'PROCESSING' && !isManualPaymentProcessingStale(payment, claimData)) {
          return { error: 'manual_payment_processing', statusCode: 409 };
        }
      } else if (payment.status === 'PROCESSING' && !isManualPaymentProcessingStale(payment)) {
        return { error: 'manual_payment_processing', statusCode: 409 };
      }

      transaction.set(claimRef, {
        reference_code: referenceCode,
        transaction_id_normalized: payment.transaction_id_normalized,
        status: 'PROCESSING',
        user_id: payment.user_id,
        amount: payment.amount,
        claimed_by: req.user.id,
        claimed_at: now,
        approval_lease_id: approvalLeaseId,
        retry_count: claimDoc.exists ? (claimDoc.data()?.retry_count || 0) + 1 : 0,
        updated_at: now
      }, { merge: true });
      transaction.update(ref, {
        status: 'PROCESSING',
        approval_claimed_at: now,
        approval_claimed_by: req.user.id,
        approval_lease_id: approvalLeaseId,
        admin_note: adminNote || null,
        updated_at: now
      });

      return { payment, claimRef, approvalLeaseId };
    });

    if (claim.alreadyApproved) {
      return res.json({ success: true, status: 'APPROVED', already_approved: true });
    }
    if (claim.error) {
      return res.status(claim.statusCode || 500).json({ error: claim.error });
    }

    try {
      await applyPurchasedEntitlement({
        userId: claim.payment.user_id,
        planId: claim.payment.plan_id,
        type: claim.payment.type,
        targetId: claim.payment.target_id,
        reference: `wave_${referenceCode}`,
        paymentMethod: WAVE_PROVIDER,
        note: claim.payment.note || null,
        purchaseMeta: {
          manualReference: referenceCode,
          transactionId: claim.payment.transaction_id,
          payerPhone: claim.payment.payer_phone || null
        }
      });
    } catch (entitlementError) {
      const failedAt = new Date().toISOString();
      await db.runTransaction(async (transaction) => {
        const paymentDoc = await transaction.get(ref);
        const claimDoc = await transaction.get(claim.claimRef);
        const latestPayment = paymentDoc.data() || {};
        const latestClaim = claimDoc.data() || {};
        if (latestPayment.approval_lease_id !== claim.approvalLeaseId || latestClaim.approval_lease_id !== claim.approvalLeaseId) {
          return;
        }
        transaction.update(ref, {
          status: 'SUBMITTED',
          approval_error: entitlementError.message || 'entitlement_failed',
          approval_lease_id: null,
          updated_at: failedAt
        });
        transaction.set(claim.claimRef, {
          status: 'FAILED',
          error: entitlementError.message || 'entitlement_failed',
          failed_at: failedAt,
          updated_at: failedAt
        }, { merge: true });
      });
      throw entitlementError;
    }

    const approvedAt = new Date().toISOString();
    const finalized = await db.runTransaction(async (transaction) => {
      const paymentDoc = await transaction.get(ref);
      const claimDoc = await transaction.get(claim.claimRef);
      const latestPayment = paymentDoc.data() || {};
      const latestClaim = claimDoc.data() || {};
      const leaseMatches = latestPayment.approval_lease_id === claim.approvalLeaseId
        && latestClaim.approval_lease_id === claim.approvalLeaseId
        && latestPayment.status === 'PROCESSING'
        && latestClaim.status === 'PROCESSING';
      if (!leaseMatches) {
        return false;
      }
      transaction.update(ref, {
        status: 'APPROVED',
        approved_at: approvedAt,
        approved_by: req.user.id,
        admin_note: adminNote || null,
        approval_lease_id: null,
        updated_at: approvedAt
      });
      transaction.set(claim.claimRef, {
        status: 'APPROVED',
        approved_at: approvedAt,
        approved_by: req.user.id,
        updated_at: approvedAt
      }, { merge: true });
      return true;
    });
    if (!finalized) {
      return res.status(409).json({ error: 'manual_payment_approval_lease_lost' });
    }

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
    const rejectedAt = new Date().toISOString();
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(ref);
      if (!doc.exists) return { error: 'manual_payment_not_found', statusCode: 404 };
      const payment = doc.data() || {};
      const claimRef = payment.transaction_id_normalized
        ? db.collection(MANUAL_PAYMENT_TRANSACTION_CLAIMS_COLLECTION).doc(hashFirestoreId(payment.transaction_id_normalized))
        : null;
      const claimDoc = claimRef ? await transaction.get(claimRef) : null;
      const claimData = claimDoc?.exists ? claimDoc.data() || {} : {};

      if (payment.status === 'APPROVED' || claimData.status === 'APPROVED' || claimData.status === 'ENTITLEMENT_APPLIED') {
        return { error: 'manual_payment_already_approved', statusCode: 409 };
      }
      if (payment.status === 'PROCESSING' || claimData.status === 'PROCESSING') {
        return { error: 'manual_payment_processing', statusCode: 409 };
      }
      if (claimData.reference_code && claimData.reference_code !== referenceCode) {
        return { error: 'wave_transaction_already_claimed', statusCode: 409 };
      }

      transaction.update(ref, {
        status: 'REJECTED',
        rejected_at: rejectedAt,
        rejected_by: req.user.id,
        admin_note: adminNote || null,
        approval_lease_id: null,
        updated_at: rejectedAt
      });
      if (claimRef) {
        transaction.set(claimRef, {
          reference_code: referenceCode,
          transaction_id_normalized: payment.transaction_id_normalized,
          status: 'REJECTED',
          rejected_at: rejectedAt,
          rejected_by: req.user.id,
          updated_at: rejectedAt
        }, { merge: true });
      }
      return { success: true, payment };
    });
    if (result.error) return res.status(result.statusCode || 500).json({ error: result.error });

    if (result.payment?.user_id) {
      await createPaymentNotificationSafely({
        userId: result.payment.user_id,
        type: NOTIFICATION_TYPES.PAYMENT_FAILED,
        title: 'Paiement Wave refuse',
        message: adminNote
          ? `Votre paiement ${referenceCode} n'a pas ete valide : ${adminNote}`
          : `Votre paiement ${referenceCode} n'a pas ete valide. Verifiez les informations Wave puis ressayez.`,
        targetId: referenceCode,
        metadata: {
          payment_reference: referenceCode,
          purchase_type: result.payment.type || null,
          plan_id: result.payment.plan_id || null,
          payment_method: WAVE_PROVIDER,
          status: 'REJECTED',
          next_route: '/store',
          admin_note: adminNote || null
        },
        dedupeKey: `payment_failed_${result.payment.user_id}_${referenceCode}`,
        sendPush: true,
        awaitPush: true,
        pushData: {
          type: 'PAYMENT_FAILED',
          reference: referenceCode,
          purchaseType: result.payment.type || ''
        }
      });
    }

    return res.json({ success: true, status: 'REJECTED' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'wave_manual_reject_failed' });
  }
};

const initializePayment = async (req, res) => {
  if (!isPaystackInitializationEnabled()) {
    return res.status(410).json(paystackDisabledPayload);
  }

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

  if (!PAYSTACK_SECRET_KEY) return res.status(503).json(paystackUnavailablePayload);
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
  if (!hasPaystackSecret()) {
    return res.status(503).json(paystackUnavailablePayload);
  }

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
  if (!hasPaystackSecret()) {
    return res.sendStatus(503);
  }

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
