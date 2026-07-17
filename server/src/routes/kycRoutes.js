const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getMyKycStatus, submitKycRequest } = require('../controllers/kycController');

router.get('/me', requireAuth, getMyKycStatus);
router.post('/requests', requireAuth, submitKycRequest);

module.exports = router;
