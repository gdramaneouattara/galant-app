const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { updateProfile, boostProfile, completePartnerProfile } = require('../controllers/profileController');

router.post('/update', requireAuth, updateProfile);
router.post('/boost', requireAuth, boostProfile);
router.post('/complete-partner', requireAuth, completePartnerProfile);

module.exports = router;
