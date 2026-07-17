const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { sendMessage, markAsRead, createDirectThread, reportUser, markMessagePlayed } = require('../controllers/messageController');

router.post('/send', requireAuth, sendMessage);
router.post('/mark-read', requireAuth, markAsRead);
router.post('/direct-thread', requireAuth, createDirectThread);
router.post('/venue-thread', requireAuth, createVenueThread);
router.post('/report', requireAuth, reportUser);
router.post('/:id/played', requireAuth, markMessagePlayed);

module.exports = router;
