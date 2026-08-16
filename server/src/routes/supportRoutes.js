const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getMySupportThread,
  sendUserSupportMessage,
  markMySupportThreadRead,
} = require('../controllers/supportController');

router.get('/thread', requireAuth, getMySupportThread);
router.post('/messages', requireAuth, sendUserSupportMessage);
router.post('/read', requireAuth, markMySupportThreadRead);

module.exports = router;
