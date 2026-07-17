const { db, rtdb } = require('../config/firebase');
const { apiRequest } = require('../services/aiService');
const { sendPushNotification } = require('../services/notificationService');

const CONCIERGE_ID = 'galant_concierge_official';

/**
 * Envoie un message de la part du Concierge (Chat + Push)
 */
const sendConciergeMessage = async (userId, content, metadata = {}) => {
  try {
    const matchId = [CONCIERGE_ID, userId].sort().join('_');

    // 1. Mise à jour ou création du match concierge
    await db.collection('matches').doc(matchId).set({
      user_one_id: CONCIERGE_ID,
      user_two_id: userId,
      status: 'ACTIVE',
      is_concierge: true,
      last_message_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }, { merge: true });

    // 2. Message dans la RTDB (pour le chat temps réel)
    await rtdb.ref(`messages/${matchId}`).push().set({
      sender_id: CONCIERGE_ID,
      content,
      message_type: 'TEXT',
      created_at: new Date().toISOString(),
      is_read: false,
      metadata
    });

    // 3. Notification Push (pour ramener l'utilisateur dans l'app)
    const title = metadata.pushTitle || "Message du Concierge 🌹";
    void sendPushNotification(userId, title, content, {
      type: 'CONCIERGE_CHAT',
      matchId
    });

  } catch (e) {
    console.error('[Concierge Error]', e.message);
  }
};

/**
 * Prévient les utilisateurs compatibles que de nouveaux profils sont disponibles
 */
const notifyNewProfiles = async (newUserId, city) => {
  try {
    const snapshot = await db.collection('profiles')
      .where('city', '==', city)
      .where('onboarding_completed', '==', true)
      .limit(30)
      .get();

    const recipients = snapshot.docs
      .map(doc => doc.id)
      .filter(id => id !== newUserId && id !== CONCIERGE_ID);

    for (const uid of recipients) {
      await sendConciergeMessage(uid, `Une nouvelle vague d'élégance vient d'arriver à ${city}. Venez découvrir les nouveaux profils certifiés !`, {
        pushTitle: "Nouveaux profils disponibles ✨",
        action_trigger: 'NEW_PROFILES'
      });
    }
  } catch (e) {
    console.error('[Concierge Notify Error]', e.message);
  }
};

/**
 * Analyse une action et décide d'intervenir ou non
 */
const processUserAction = async (userId, actionType, context = {}) => {
  const userDoc = await db.collection('profiles').doc(userId).get();
  if (!userDoc.exists) return;
  const user = { id: userDoc.id, ...userDoc.data() };

  let message = "";
  let pushTitle = "";

  switch (actionType) {
    case 'WELCOME':
      message = `Bonjour ${user.name}, je suis votre Concierge Galant. Ravi de vous compter parmi nos membres fondateurs. En ce moment, nous sélectionnons les profils les plus élégants de ${user.city || 'votre ville'}. Je vous préviendrai dès que de nouveaux profils certifiés seront disponibles. En attendant, explorez l'Agenda !`;
      pushTitle = "Bienvenue sur Galant 🌹";
      break;

    case 'EMPTY_DISCOVER':
      const hoursUntilRefresh = 24 - new Date().getHours();
      message = `Le succès demande de la patience, ${user.name}. Pour garantir l'exclusivité, nous distillons les profils par vagues. La prochaine sélection sera disponible dans environ ${hoursUntilRefresh} heures. Je vous enverrai une notification personnelle dès leur arrivée !`;
      pushTitle = "À très vite sur Galant ✨";
      break;

    case 'BADGE_VERIFIED':
      message = `Félicitations ${user.name} ! Votre profil est désormais officiellement certifié. Ce badge 💎 témoigne de votre authenticité. Vous êtes prêt(e) pour des rencontres d'exception.`;
      pushTitle = "Profil Certifié ! 💎";
      if (user.city) void notifyNewProfiles(userId, user.city); // On prévient les autres !
      break;

    case 'INCOMPLETE_PROFILE':
      if (!user.bio || (user.photos && user.photos.length < 3)) {
        message = `Votre élégance mérite d'être vue sous tous ses angles. Il manque encore une petite touche (bio ou 3ème photo) pour que votre profil soit parfait. Relevez le défi et je boosterai votre visibilité !`;
        pushTitle = "Sublimez votre profil 🌹";
      }
      break;

    case 'LIKES_RECIEVED':
      const likeCount = context.count || 5;
      if (!user.is_premium) {
        message = `L'intérêt à votre égard grandit, ${user.name}. ${likeCount} profils d'exception ont manifesté leur admiration. Le privilège Premium vous permettrait de les découvrir à l'instant et de choisir votre prochaine rencontre.`;
        pushTitle = "On vous admire... 🌹";
      }
      break;

    case 'PRIME_TIME_BOOST':
      message = `C'est le moment idéal, ${user.name}. L'activité est à son comble à ${user.city || 'proximité'}. Un Boost d'une heure vous placerait en tête de liste pour toutes les personnes connectées en ce moment. L'élégance n'attend pas.`;
      pushTitle = "Rayonnez sur Galant ✨";
      break;

    case 'EXPERT_ADVICE_VENUE':
      const venueName = context.venueName || 'nos partenaires';
      message = `Pour un premier rendez-vous réussi, mon expertise me porte vers ${venueName}. Le cadre y est d'un raffinement rare, idéal pour une discussion mémorable. C'est l'adresse favorite des membres de votre standing.`;
      pushTitle = "Conseil d'Expert 🍷";
      break;

    case 'ROSE_USAGE_TIP':
      message = `Saviez-vous que l'utilisation d'une Rose Note ✉️ multiplie par trois vos chances d'obtenir une réponse ? Ne laissez pas le hasard décider ; montrez votre intérêt avec l'élégance que vous incarnez.`;
      pushTitle = "Le secret du succès 🌹";
      break;
  }

  if (message) {
    await sendConciergeMessage(userId, message, {
      pushTitle,
      action_trigger: actionType
    });
  }
};

module.exports = { processUserAction, sendConciergeMessage, notifyNewProfiles };
