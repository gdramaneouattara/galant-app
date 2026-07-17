const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getCommunities, createCommunity, joinCommunity, leaveCommunity,
  getCommunityMessages, sendCommunityMessage, getCommunityMembers
} = require('../controllers/communityController');

router.get('/', requireAuth, getCommunities);
router.post('/create', requireAuth, createCommunity);
router.post('/:communityId/join', requireAuth, joinCommunity);
router.delete('/:communityId/leave', requireAuth, leaveCommunity);
router.get('/:communityId/messages', requireAuth, getCommunityMessages);
router.post('/:communityId/messages', requireAuth, sendCommunityMessage);
router.get('/:communityId/members', requireAuth, getCommunityMembers);

module.exports = router;
