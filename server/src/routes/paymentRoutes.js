const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getPaymentPricing,
  createWaveManualPayment,
  submitWaveManualPaymentProof,
  initializePayment,
  verifyPayment,
  googleVerify,
  appleVerify,
  handleWebhook
} = require('../controllers/paymentController');

router.post('/webhook', handleWebhook);
router.get('/pricing', requireAuth, getPaymentPricing);
router.post('/wave/manual-intent', requireAuth, createWaveManualPayment);
router.post('/wave/manual-proof', requireAuth, submitWaveManualPaymentProof);
router.post('/initialize', requireAuth, initializePayment);
router.get('/verify', requireAuth, verifyPayment);
router.post('/google-verify', requireAuth, googleVerify);
router.post('/apple-verify', requireAuth, appleVerify);

module.exports = router;
