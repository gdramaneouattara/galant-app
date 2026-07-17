const { db } = require('../config/firebase');
const { processUserAction } = require('./conciergeService');

/**
 * Simule une analyse d'image et de texte par IA
 * Dans une version réelle, on appellerait Google Vision API ou OpenAI
 */
const autoReviewProfile = async (userId) => {
  try {
    const userDoc = await db.collection('profiles').doc(userId).get();
    const user = userDoc.data();

    // 1. Critères de l'IA Galant
    const hasMinPhotos = user.photos && user.photos.length >= 3;
    const hasBio = user.bio && user.bio.length > 10;

    // 2. Décision Automatique
    if (hasMinPhotos && hasBio) {
      // Approbation immédiate par l'IA
      await db.collection('profiles').doc(userId).update({
        is_verified: true, // On lui donne le badge direct
        ai_moderated: true,
        moderated_at: new Date().toISOString()
      });

      // 3. Déclencher le message de félicitations du Concierge
      await processUserAction(userId, 'BADGE_VERIFIED');

      console.log(`[AI Moderator] Profil ${userId} approuvé automatiquement.`);
      return true;
    } else {
      // Si l'IA a un doute, elle demande au Concierge de relancer l'utilisateur
      await processUserAction(userId, 'INCOMPLETE_PROFILE');
      return false;
    }
  } catch (e) {
    console.error('[AI Moderator Error]', e.message);
    return false;
  }
};

module.exports = { autoReviewProfile };
