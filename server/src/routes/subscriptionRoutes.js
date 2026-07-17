const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { syncSubscription } = require('../controllers/subscriptionController');

router.post('/sync', requireAuth, syncSubscription);

module.exports = router;
