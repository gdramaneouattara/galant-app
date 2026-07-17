const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { exportData, deleteAccount } = require('../controllers/privacyController');

router.get('/export', requireAuth, exportData);
router.post('/delete-account', requireAuth, deleteAccount);

module.exports = router;
