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
app.get('/api/ping', (req, res) => res.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  mountErrors: Object.keys(mountErrors).length > 0 ? mountErrors : 'none'
}));

const mountErrors = {};

// Initialisation sécurisée des routes (DO NOT REFACTOR - Tests depend on these exact strings)
try { const aiRoutes = require('./routes/aiRoutes'); app.use('/api/ai', aiRoutes); } catch (e) { mountErrors['/api/ai'] = e.message; console.error('❌ Failed /api/ai', e.message); }
try { const messageRoutes = require('./routes/messageRoutes'); app.use('/api/messages', messageRoutes); } catch (e) { mountErrors['/api/messages'] = e.message; console.error('❌ Failed /api/messages', e.message); }
try { const matchmakingRoutes = require('./routes/matchmakingRoutes'); app.use('/api/matchmaking', matchmakingRoutes); } catch (e) { mountErrors['/api/matchmaking'] = e.message; console.error('❌ Failed /api/matchmaking', e.message); }
try { const paymentRoutes = require('./routes/paymentRoutes'); app.use('/api/payments', paymentRoutes); } catch (e) { mountErrors['/api/payments'] = e.message; console.error('❌ Failed /api/payments', e.message); }
try { const adminRoutes = require('./routes/adminRoutes'); app.use('/api/admin', adminRoutes); } catch (e) { mountErrors['/api/admin'] = e.message; console.error('❌ Failed /api/admin', e.message); }
try { const subscriptionRoutes = require('./routes/subscriptionRoutes'); app.use('/api/subscriptions', subscriptionRoutes); } catch (e) { mountErrors['/api/subscriptions'] = e.message; console.error('❌ Failed /api/subscriptions', e.message); }
try { const venueRoutes = require('./routes/venueRoutes'); app.use('/api/venues', venueRoutes); } catch (e) { mountErrors['/api/venues'] = e.message; console.error('❌ Failed /api/venues', e.message); }
try { const statusRoutes = require('./routes/statusRoutes'); app.use('/api/statuses', statusRoutes); } catch (e) { mountErrors['/api/statuses'] = e.message; console.error('❌ Failed /api/statuses', e.message); }
try { const communityRoutes = require('./routes/communityRoutes'); app.use('/api/communities', communityRoutes); } catch (e) { mountErrors['/api/communities'] = e.message; console.error('❌ Failed /api/communities', e.message); }
try { const kycRoutes = require('./routes/kycRoutes'); app.use('/api/kyc', kycRoutes); } catch (e) { mountErrors['/api/kyc'] = e.message; console.error('❌ Failed /api/kyc', e.message); }
try { const profileRoutes = require('./routes/profileRoutes'); app.use('/api/profiles', profileRoutes); } catch (e) { mountErrors['/api/profiles'] = e.message; console.error('❌ Failed /api/profiles', e.message); }
try { const privacyRoutes = require('./routes/privacyRoutes'); app.use('/api/privacy', privacyRoutes); } catch (e) { mountErrors['/api/privacy'] = e.message; console.error('❌ Failed /api/privacy', e.message); }
try { const notificationRoutes = require('./routes/notificationRoutes'); app.use('/api/notifications', notificationRoutes); } catch (e) { mountErrors['/api/notifications'] = e.message; console.error('❌ Failed /api/notifications', e.message); }
try { const likeRoutes = require('./routes/likeRoutes'); app.use('/api/likes', likeRoutes); } catch (e) { mountErrors['/api/likes'] = e.message; console.error('❌ Failed /api/likes', e.message); }
try { const superLikeRoutes = require('./routes/superLikeRoutes'); app.use('/api/super-likes', superLikeRoutes); } catch (e) { mountErrors['/api/super-likes'] = e.message; console.error('❌ Failed /api/super-likes', e.message); }
try { const mediaRoutes = require('./routes/mediaRoutes'); app.use('/api/media', mediaRoutes); } catch (e) { mountErrors['/api/media'] = e.message; console.error('❌ Failed /api/media', e.message); }
try { const trackingRoutes = require('./routes/trackingRoutes'); app.use('/api/tracking', trackingRoutes); } catch (e) { mountErrors['/api/tracking'] = e.message; console.error('❌ Failed /api/tracking', e.message); }
try { const yangoRoutes = require('./routes/yangoRoutes'); app.use('/api/yango', yangoRoutes); } catch (e) { mountErrors['/api/yango'] = e.message; console.error('❌ Failed /api/yango', e.message); }

// Tâches de fond (Cron)
try {
  const { initCronJobs } = require('./services/cronService');
  setTimeout(() => {
    initCronJobs();
  }, 10000);
} catch (error) {
  console.error('⚠️ Warning: Cron service failed to initialize:', error.message);
}

// 404 Catch-all Handler
app.use((req, res) => {
  console.warn(`🔍 404 NOT FOUND: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'route_not_found',
    path: req.originalUrl,
    mountErrors: Object.keys(mountErrors).length > 0 ? mountErrors : undefined
  });
});

// ==========================================
// 3. DÉMARRAGE
// ==========================================
app.listen(PORT_TO_LISTEN, '0.0.0.0', () => {
  console.log('✅=========================================');
  console.log(`🚀 GALANT SERVER READY ON PORT ${PORT_TO_LISTEN}`);
  console.log('✅=========================================');
});
