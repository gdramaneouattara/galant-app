const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { processUserAction } = require('../services/conciergeService');
const { autoReviewProfile } = require('../services/aiModeratorService');
const { trackAdminLogin } = require('../services/securityService');

router.post('/event', requireAuth, async (req, res) => {
  const { eventType, context } = req.body;
  const userId = req.user.id;

  // Analyse de l'action par le concierge
  processUserAction(userId, eventType, context || {});

  // Sécurité Admin : Détection de nouvel appareil
  if (eventType === 'LOGIN' && req.user.is_admin) {
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    trackAdminLogin(userId, userAgent, ip);
  }

  // Si c'est une fin d'onboarding, on lance le modérateur IA
  if (eventType === 'WELCOME') {
    autoReviewProfile(userId);
  }

  res.json({ success: true });
});

module.exports = router;
