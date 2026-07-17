const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getVenues, getVenueRecommendations, getAgendaEvents, createPartnerEvent, deletePartnerEvent,
  createVenueChatThread, getPartnerChats, getUserVenueChats, getMyVenue, updateVenue,
  updateVenuePhotos, getVenueStats, logVenueView, attendEvent, unattendEvent
} = require('../controllers/venueController');

router.get('/', requireAuth, getVenues);
router.get('/recommendations', requireAuth, getVenueRecommendations);
router.get('/agenda', requireAuth, getAgendaEvents);
router.post('/agenda/:id/attend', requireAuth, attendEvent);
router.post('/agenda/:id/unattend', requireAuth, unattendEvent);
router.post('/partner/events', requireAuth, createPartnerEvent);
router.delete('/partner/events/:id', requireAuth, deletePartnerEvent);
router.post('/:id/chat-thread', requireAuth, createVenueChatThread);
router.get('/partner/chats', requireAuth, getPartnerChats);
router.get('/user/venue-chats', requireAuth, getUserVenueChats);
router.get('/partner/my-venue', requireAuth, getMyVenue);
router.post('/partner/venue/update', requireAuth, updateVenue);
router.post('/partner/venue/photos', requireAuth, updateVenuePhotos);
router.get('/partner/venue-stats/:venueId', requireAuth, getVenueStats);
router.post('/:id/log-view', requireAuth, logVenueView);

module.exports = router;
