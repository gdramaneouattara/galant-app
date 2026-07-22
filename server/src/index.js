const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT_TO_LISTEN = process.env.PORT || 8080;

// ==========================================
// 1. DÉMARRAGE IMMÉDIAT (PRIORITÉ ABSOLUE)
// ==========================================
app.listen(PORT_TO_LISTEN, '0.0.0.0', () => {
  console.log('✅=========================================');
  console.log(`🚀 GALANT SERVER READY ON PORT ${PORT_TO_LISTEN}`);
  console.log('✅=========================================');
});

// Capture des erreurs fatales pour éviter le crash du container
process.on('uncaughtException', (err) => {
  console.error('🔥 FATAL ERROR:', err.message);
});

// ==========================================
// 2. CONFIGURATION ET ROUTES (ENSUITE)
// ==========================================
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '1mb' }));

// Health check pour Google Cloud
app.get('/', (req, res) => res.status(200).send('GALANT API LIVE'));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

try {
  // Chargement des services
  const { initCronJobs } = require('./services/cronService');

  // Routes variables for test alignment
  const aiRoutes = require('./routes/aiRoutes');
  const messageRoutes = require('./routes/messageRoutes');
  const matchmakingRoutes = require('./routes/matchmakingRoutes');
  const paymentRoutes = require('./routes/paymentRoutes');
  const adminRoutes = require('./routes/adminRoutes');
  const subscriptionRoutes = require('./routes/subscriptionRoutes');
  const venueRoutes = require('./routes/venueRoutes');
  const statusRoutes = require('./routes/statusRoutes');
  const communityRoutes = require('./routes/communityRoutes');
  const kycRoutes = require('./routes/kycRoutes');
  const profileRoutes = require('./routes/profileRoutes');
  const privacyRoutes = require('./routes/privacyRoutes');
  const notificationRoutes = require('./routes/notificationRoutes');
  const likeRoutes = require('./routes/likeRoutes');
  const superLikeRoutes = require('./routes/superLikeRoutes');
  const mediaRoutes = require('./routes/mediaRoutes');
  const trackingRoutes = require('./routes/trackingRoutes');
  const yangoRoutes = require('./routes/yangoRoutes');

  // Montage des routes
  app.use('/api/ai', aiRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/matchmaking', matchmakingRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/venues', venueRoutes);
  app.use('/api/statuses', statusRoutes);
  app.use('/api/communities', communityRoutes);
  app.use('/api/kyc', kycRoutes);
  app.use('/api/profiles', profileRoutes);
  app.use('/api/privacy', privacyRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/likes', likeRoutes);
  app.use('/api/super-likes', superLikeRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/tracking', trackingRoutes);
  app.use('/api/yango', yangoRoutes);

  // Tâches de fond (Cron)
  setTimeout(() => {
    initCronJobs();
  }, 10000);

} catch (error) {
  console.error('⚠️ Warning during route initialization:', error.message);
}
