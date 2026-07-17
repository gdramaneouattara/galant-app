const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getWritingSuggestions, handleTranslation } = require('../controllers/aiController');

router.post('/writing-assistant', requireAuth, getWritingSuggestions);
router.post('/translate', requireAuth, handleTranslation);

module.exports = router;
