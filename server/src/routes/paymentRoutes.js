const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { initializePayment, verifyPayment, googleVerify, appleVerify } = require('../controllers/paymentController');

router.post('/initialize', requireAuth, initializePayment);
router.get('/verify', requireAuth, verifyPayment);
router.post('/google-verify', requireAuth, googleVerify);
router.post('/apple-verify', requireAuth, appleVerify);

module.exports = router;
