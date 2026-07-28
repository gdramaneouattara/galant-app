const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { scheduleCheckIn, confirmSafety, triggerImmediateSOS } = require('../controllers/securityController');

router.post('/schedule', requireAuth, scheduleCheckIn);
router.post('/confirm', requireAuth, confirmSafety);
router.post('/sos', requireAuth, triggerImmediateSOS);

module.exports = router;
