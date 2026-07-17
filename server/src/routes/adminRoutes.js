const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  getStats, getPendingVenues, approveVenue, rejectVenue, reconcileProfiles,
  getPrivacyRequests, resolvePrivacyRequest, getPhotoReviews, reviewPhoto,
  getKycRequests, reviewKyc, getBroadcastAudience, broadcastMessage, getCampaignHistory
} = require('../controllers/adminController');

router.use(requireAuth);
router.use(requireAdmin);

router.get('/stats', getStats);
router.get('/venues/pending', getPendingVenues);
router.post('/venues/:id/approve', approveVenue);
router.post('/venues/:id/reject', rejectVenue);
router.post('/users/reconcile-profiles', reconcileProfiles);
router.get('/privacy-requests', getPrivacyRequests);
router.post('/privacy-requests/:id/resolve', resolvePrivacyRequest);
router.get('/photo-reviews', getPhotoReviews);
router.post('/photo-reviews/:id/review', reviewPhoto);
router.get('/kyc/requests', getKycRequests);
router.post('/kyc/requests/:id/review', reviewKyc);
router.get('/users', getUsers);
router.post('/users/:id/toggle-status', toggleUserStatus);
router.get('/messages/audience', getBroadcastAudience);
router.post('/messages/broadcast', broadcastMessage);
router.get('/messages/history', getCampaignHistory);

module.exports = router;
