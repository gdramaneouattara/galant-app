const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getStatuses, createStatus, likeStatus, unlikeStatus, getStatusLikes } = require('../controllers/statusController');

router.get('/', requireAuth, getStatuses);
router.post('/', requireAuth, createStatus);
router.post('/:id/like', requireAuth, likeStatus);
router.delete('/:id/like', requireAuth, unlikeStatus);
router.get('/:id/likes', requireAuth, getStatusLikes);

module.exports = router;
