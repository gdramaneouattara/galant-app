const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getNotifications, getUnreadCount, markAsRead, markAllAsRead, archiveNotification } = require('../controllers/notificationController');

router.get('/', requireAuth, getNotifications);
router.get('/unread-count', requireAuth, getUnreadCount);
router.post('/read-all', requireAuth, markAllAsRead);
router.post('/:id/read', requireAuth, markAsRead);
router.post('/:id/archive', requireAuth, archiveNotification);

module.exports = router;
