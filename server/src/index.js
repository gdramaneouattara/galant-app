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

  // Montage des routes
  app.use('/api/ai', require('./routes/aiRoutes'));
  app.use('/api/messages', require('./routes/messageRoutes'));
  app.use('/api/matchmaking', require('./routes/matchmakingRoutes'));
  app.use('/api/payments', require('./routes/paymentRoutes'));
  app.use('/api/admin', require('./routes/adminRoutes'));
  app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
  app.use('/api/venues', require('./routes/venueRoutes'));
  app.use('/api/statuses', require('./routes/statusRoutes'));
  app.use('/api/communities', require('./routes/communityRoutes'));
  app.use('/api/kyc', require('./routes/kycRoutes'));
  app.use('/api/profiles', require('./routes/profileRoutes'));
  app.use('/api/privacy', require('./routes/privacyRoutes'));
  app.use('/api/notifications', require('./routes/notificationRoutes'));
  app.use('/api/likes', require('./routes/likeRoutes'));
  app.use('/api/super-likes', require('./routes/superLikeRoutes'));
  app.use('/api/media', require('./routes/mediaRoutes'));
  app.use('/api/tracking', require('./routes/trackingRoutes'));
  app.use('/api/yango', require('./routes/yangoRoutes'));

  // Tâches de fond (Cron)
  setTimeout(() => {
    initCronJobs();
  }, 10000);

} catch (error) {
  console.error('⚠️ Warning during route initialization:', error.message);
}
