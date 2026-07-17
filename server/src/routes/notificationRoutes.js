const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');

router.get('/', requireAuth, getNotifications);
router.post('/:id/read', requireAuth, markAsRead);
router.post('/read-all', requireAuth, markAllAsRead);

module.exports = router;
