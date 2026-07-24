const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT_TO_LISTEN = process.env.PORT || 8080;

// ==========================================
// 2. CONFIGURATION ET ROUTES
// ==========================================
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '1mb' }));

// Health check pour Google Cloud
app.get('/', (req, res) => res.status(200).send('GALANT API LIVE'));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Chargement sécurisé des routes
const mountRoute = (path, routeModule) => {
  try {
    app.use(path, require(routeModule));
    console.log(`✅ Mounted ${path}`);
  } catch (err) {
    console.error(`❌ Failed to mount ${path}:`, err.message);
  }
};

mountRoute('/api/ai', './routes/aiRoutes');
mountRoute('/api/messages', './routes/messageRoutes');
mountRoute('/api/matchmaking', './routes/matchmakingRoutes');
mountRoute('/api/payments', './routes/paymentRoutes');
mountRoute('/api/admin', './routes/adminRoutes');
mountRoute('/api/subscriptions', './routes/subscriptionRoutes');
mountRoute('/api/venues', './routes/venueRoutes');
mountRoute('/api/statuses', './routes/statusRoutes');
mountRoute('/api/communities', './routes/communityRoutes');
mountRoute('/api/kyc', './routes/kycRoutes');
mountRoute('/api/profiles', './routes/profileRoutes');
mountRoute('/api/privacy', './routes/privacyRoutes');
mountRoute('/api/notifications', './routes/notificationRoutes');
mountRoute('/api/likes', './routes/likeRoutes');
mountRoute('/api/super-likes', './routes/superLikeRoutes');
mountRoute('/api/media', './routes/mediaRoutes');
mountRoute('/api/tracking', './routes/trackingRoutes');
mountRoute('/api/yango', './routes/yangoRoutes');

// Tâches de fond (Cron)
try {
  const { initCronJobs } = require('./services/cronService');
  setTimeout(() => {
    initCronJobs();
  }, 10000);
} catch (e) {
  console.error('⚠️ Cron service failed to initialize');
}

// 404 Catch-all Handler
app.use((req, res) => {
  console.warn(`🔍 404 NOT FOUND: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'route_not_found', path: req.originalUrl });
});

// ==========================================
// 3. DÉMARRAGE
// ==========================================
app.listen(PORT_TO_LISTEN, '0.0.0.0', () => {
  console.log('✅=========================================');
  console.log(`🚀 GALANT SERVER READY ON PORT ${PORT_TO_LISTEN}`);
  console.log('✅=========================================');
});
