const { db, rtdb } = require('../config/firebase');
const { sendPushNotification } = require('../services/notificationService');

const CONCIERGE_ID = 'galant_concierge_official';
const STRICT_RELATIONSHIP_GOALS = new Set(['SERIOUS', 'MARRIAGE']);
const SOCIAL_RELATIONSHIP_GOALS = new Set(['FRIENDSHIP', 'CASUAL', 'NETWORKING']);
const NEW_PROFILE_NOTIFY_LIMIT = 80;

const normalizeText = (value = '') => String(value || '').trim().toUpperCase();

const normalizeGender = (value = '') => {
  const gender = normalizeText(value);
  if (['MAN', 'MALE', 'M', 'HOMME'].includes(gender)) return 'MALE';
  if (['WOMAN', 'FEMALE', 'F', 'FEMME'].includes(gender)) return 'FEMALE';
  return gender;
};

const normalizeList = (value) => {
  if (Array.isArray(value)) return value.map(normalizeText).filter(Boolean);
  const text = normalizeText(value);
  return text ? [text] : [];
};

const getTargetGenders = (profile = {}) => {
  const raw = profile.target_gender || profile.target_genders || profile.preferences?.targetGender;
  return normalizeList(raw).map(normalizeGender).filter(Boolean);
};

const getRelationshipGoal = (profile = {}) => normalizeText(profile.relationship_goal);

const getOppositeGender = (gender) => {
  if (gender === 'MALE') return 'FEMALE';
  if (gender === 'FEMALE') return 'MALE';
  return null;
};

const desiredGendersForNewProfilePush = (profile = {}) => {
  const goal = getRelationshipGoal(profile);
  const explicitTargets = getTargetGenders(profile);

  if (STRICT_RELATIONSHIP_GOALS.has(goal)) {
    const oppositeGender = getOppositeGender(normalizeGender(profile.gender));
    return oppositeGender ? [oppositeGender] : explicitTargets;
  }

  return explicitTargets;
};

const acceptsGenderForNewProfilePush = (recipient = {}, newProfile = {}) => {
  const recipientGender = normalizeGender(recipient.gender);
  const newProfileGender = normalizeGender(newProfile.gender);
  const recipientTargets = desiredGendersForNewProfilePush(recipient);
  const newProfileTargets = desiredGendersForNewProfilePush(newProfile);

  const recipientAcceptsNewProfile = recipientTargets.length === 0 || recipientTargets.includes(newProfileGender);
  const newProfileAcceptsRecipient = newProfileTargets.length === 0 || newProfileTargets.includes(recipientGender);

  return recipientAcceptsNewProfile && newProfileAcceptsRecipient;
};

const goalsCompatibleForNewProfilePush = (recipient = {}, newProfile = {}) => {
  const recipientGoal = getRelationshipGoal(recipient);
  const newProfileGoal = getRelationshipGoal(newProfile);

  if (!recipientGoal || !newProfileGoal) return true;
  if (recipientGoal === newProfileGoal) return true;
  if (STRICT_RELATIONSHIP_GOALS.has(recipientGoal) || STRICT_RELATIONSHIP_GOALS.has(newProfileGoal)) return false;
  if (SOCIAL_RELATIONSHIP_GOALS.has(recipientGoal) && SOCIAL_RELATIONSHIP_GOALS.has(newProfileGoal)) return true;
  return true;
};

const collectInteractedUserIds = async (newUserId) => {
  const interacted = new Set([newUserId, CONCIERGE_ID]);
  const [outgoingLikes, incomingLikes, outgoingSwipes, incomingSwipes] = await Promise.all([
    db.collection('likes').where('liker_id', '==', newUserId).limit(200).get(),
    db.collection('likes').where('liked_id', '==', newUserId).limit(200).get(),
    db.collection('swipes').where('swiper_id', '==', newUserId).limit(200).get(),
    db.collection('swipes').where('target_id', '==', newUserId).limit(200).get()
  ]);

  outgoingLikes.docs.forEach(doc => doc.data()?.liked_id && interacted.add(doc.data().liked_id));
  incomingLikes.docs.forEach(doc => doc.data()?.liker_id && interacted.add(doc.data().liker_id));
  outgoingSwipes.docs.forEach(doc => doc.data()?.target_id && interacted.add(doc.data().target_id));
  incomingSwipes.docs.forEach(doc => doc.data()?.swiper_id && interacted.add(doc.data().swiper_id));

  return interacted;
};

const isEligibleNewProfileRecipient = ({ recipientId, recipient, newProfile, interactedUserIds }) => {
  if (!recipientId || interactedUserIds.has(recipientId)) return false;
  if (!recipient?.onboarding_completed) return false;
  if (recipient?.suspended_at || recipient?.status === 'SUSPENDED') return false;
  if (!acceptsGenderForNewProfilePush(recipient, newProfile)) return false;
  if (!goalsCompatibleForNewProfilePush(recipient, newProfile)) return false;
  return true;
};

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
    const newProfileDoc = await db.collection('profiles').doc(newUserId).get();
    if (!newProfileDoc.exists) return;

    const newProfile = { id: newProfileDoc.id, ...newProfileDoc.data() };
    const targetCity = city || newProfile.city;
    if (!targetCity || !newProfile.onboarding_completed || newProfile.suspended_at || newProfile.status === 'SUSPENDED') return;

    const interactedUserIds = await collectInteractedUserIds(newUserId);
    const snapshot = await db.collection('profiles')
      .where('city', '==', targetCity)
      .limit(NEW_PROFILE_NOTIFY_LIMIT)
      .get();

    const recipients = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(profile => isEligibleNewProfileRecipient({
        recipientId: profile.id,
        recipient: profile,
        newProfile,
        interactedUserIds
      }));

    for (const profile of recipients) {
      const uid = profile.id;
      await sendConciergeMessage(uid, `Un nouveau profil compatible vient d'arriver à ${targetCity}. Ouvrez Découverte pour le rencontrer.`, {
        pushTitle: "Nouveau profil compatible ✨",
        action_trigger: 'NEW_PROFILES',
        new_profile_id: newUserId,
        compatibility_basis: 'GOAL_GENDER_CITY'
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
