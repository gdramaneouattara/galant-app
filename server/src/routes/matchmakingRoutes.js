const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getSuggestions, getVisibilityInsight, handleSwipe, unmatch } = require('../controllers/matchmakingController');

router.get('/suggestions', requireAuth, getSuggestions);
router.get('/visibility-insight', requireAuth, getVisibilityInsight);
router.post('/swipe', requireAuth, handleSwipe);
router.post('/unmatch/:matchId', requireAuth, unmatch);

module.exports = router;
