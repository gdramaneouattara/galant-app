const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { initCronJobs } = require('./services/cronService');

// Routes
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

const {
  PORT = 8787,
  ALLOWED_ORIGINS = '*'
} = process.env;

const app = express();

// Gestion sécurisée du dossier uploads pour Cloud Run
const uploadDir = path.join('/tmp', 'uploads'); // Utiliser /tmp qui est toujours accessible en écriture
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('📁 Dossier "uploads/" créé dans /tmp.');
  } catch (e) {
    console.error('⚠️ Impossible de créer le dossier uploads:', e.message);
  }
}

// Middlewares
const allowedOrigins = ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*'))
    ? cb(null, true)
    : cb(new Error('CORS_ERROR'))
}));
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Mount Routes
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
app.use('/api/premium', superLikeRoutes); // Alias for legacy premium endpoints
app.use('/api/media', mediaRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/yango', yangoRoutes);

// Compatibility aliases (if needed by frontend)
app.use('/api/profile', profileRoutes); // Some endpoints might use singular /profile

// Start Server
const serverPort = process.env.PORT || PORT;
app.listen(serverPort, '0.0.0.0', () => {
  console.log(`🚀 GALANT Server LIVE on port ${serverPort}`);

  // Lancer les tâches de fond après le démarrage pour ne pas bloquer le serveur
  setTimeout(() => {
    try {
      initCronJobs();
    } catch (e) {
      console.error('❌ Erreur lors du lancement des Cron Jobs:', e.message);
    }
  }, 5000);
});
