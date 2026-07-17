const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getSuperLikesReceived, respondToSuperLike } = require('../controllers/matchmakingController');

router.get('/received', requireAuth, getSuperLikesReceived);
router.post('/:id/respond', requireAuth, respondToSuperLike);

module.exports = router;
