const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getLikesReceived, getLikesQuota } = require('../controllers/matchmakingController');

router.get('/received', requireAuth, getLikesReceived);
router.get('/quota', requireAuth, getLikesQuota);

module.exports = router;
