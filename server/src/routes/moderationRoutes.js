const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { checkPhotos } = require('../controllers/moderationController');

router.post('/photos/check', requireAuth, checkPhotos);

module.exports = router;
