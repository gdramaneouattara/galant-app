const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  getStats, getPendingVenues, approveVenue, rejectVenue, reconcileProfiles,
  getPrivacyRequests, resolvePrivacyRequest, getPhotoReviews, reviewPhoto,
  getKycRequests, reviewKyc, getBroadcastAudience, broadcastMessage, getCampaignHistory,
  getReports, resolveReport, getUsers, toggleUserStatus, getPricing, updatePricing, reconcileCounters, backfillGeohashes,
  seedVenuesFromGoogle, searchTikeramaAgenda, importTikeramaAgenda,
  getAdminAgendaEvents, deleteAdminAgendaEvent, cleanupAdminExpiredAgendaEvents,
  backfillMediaVariants, cleanupMediaOrphans
} = require('../controllers/adminController');
const {
  getAdminSupportThreads,
  getAdminSupportMessages,
  sendAdminSupportReply,
  updateAdminSupportThreadStatus,
} = require('../controllers/supportController');

router.use(requireAuth);
router.use(requireAdmin);

router.get('/stats', getStats);
router.get('/venues/pending', getPendingVenues);
router.post('/venues/seed', seedVenuesFromGoogle);
router.post('/agenda/tikerama/search', searchTikeramaAgenda);
router.post('/agenda/tikerama/import', importTikeramaAgenda);
router.get('/agenda/events', getAdminAgendaEvents);
router.delete('/agenda/events/:id', deleteAdminAgendaEvent);
router.post('/agenda/events/cleanup-expired', cleanupAdminExpiredAgendaEvents);
router.post('/venues/:id/approve', approveVenue);
router.post('/venues/:id/reject', rejectVenue);
router.post('/users/reconcile-profiles', reconcileProfiles);
router.post('/users/reconcile-counters', reconcileCounters);
router.post('/users/backfill-geohashes', backfillGeohashes);
router.post('/media/backfill-variants', backfillMediaVariants);
router.post('/media/cleanup-orphans', cleanupMediaOrphans);
router.get('/privacy-requests', getPrivacyRequests);
router.post('/privacy-requests/:id/resolve', resolvePrivacyRequest);
router.get('/photo-reviews', getPhotoReviews);
router.post('/photo-reviews/:id/review', reviewPhoto);
router.get('/reports', getReports);
router.post('/reports/:id/resolve', resolveReport);
router.get('/kyc/requests', getKycRequests);
router.post('/kyc/requests/:id/review', reviewKyc);
router.get('/users', getUsers);
router.post('/users/:id/toggle-status', toggleUserStatus);
router.get('/messages/audience', getBroadcastAudience);
router.post('/messages/broadcast', broadcastMessage);
router.get('/messages/history', getCampaignHistory);
router.get('/support/threads', getAdminSupportThreads);
router.get('/support/threads/:threadId/messages', getAdminSupportMessages);
router.post('/support/threads/:threadId/reply', sendAdminSupportReply);
router.post('/support/threads/:threadId/status', updateAdminSupportThreadStatus);

router.get('/pricing', getPricing);
router.post('/pricing', updatePricing);

module.exports = router;
