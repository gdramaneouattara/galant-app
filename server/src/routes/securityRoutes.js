const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { scheduleCheckIn, confirmSafety } = require('../controllers/securityController');

router.post('/schedule', requireAuth, scheduleCheckIn);
router.post('/confirm', requireAuth, confirmSafety);

module.exports = router;
