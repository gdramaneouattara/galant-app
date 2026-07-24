const express = require('express');
const router = express.Router();
const { requireAuth, requireBaseAuth } = require('../middleware/auth');
const { createProfile, updateProfile, boostProfile, completePartnerProfile } = require('../controllers/profileController');

router.post('/create', requireBaseAuth, createProfile);
router.post('/update', requireAuth, updateProfile);
router.post('/boost', requireAuth, boostProfile);
router.post('/complete-partner', requireAuth, completePartnerProfile);

module.exports = router;
