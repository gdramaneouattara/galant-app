const axios = require('axios');
const { db, admin } = require('../config/firebase');
const { STORY_LIKE_NOTIFICATION_DEDUP_MS } = require('../config/constants');

const EXPO_PUSH_ACCESS_TOKEN = process.env.EXPO_PUSH_ACCESS_TOKEN || '';

/**
 * Sends a push notification via Firebase Cloud Messaging (FCM) or Expo
 */
const sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    const snapshot = await db.collection('push_tokens')
      .where('user_id', '==', userId)
      .where('is_active', '==', true)
      .get();

    if (snapshot.empty) return;

    const tokens = snapshot.docs.map(doc => doc.data().token);

    // Split tokens into FCM and Expo
    const fcmTokens = tokens.filter(t => !t.includes('ExponentPushToken'));
    const expoTokens = tokens.filter(t => t.includes('ExponentPushToken'));

    // 1. Send via Firebase Admin (FCM)
    if (fcmTokens.length > 0 && admin) {
      try {
        const message = {
          notification: { title, body },
          data: Object.keys(data).reduce((acc, key) => {
            acc[key] = String(data[key]);
            return acc;
          }, {}),
          tokens: fcmTokens,
        };
        await admin.messaging().sendEachForMulticast(message);
      } catch (fcmError) {
        console.error('FCM Send Error:', fcmError.message);
      }
    }

    // 2. Send via Expo (for backward compatibility or local dev)
    if (expoTokens.length > 0) {
      const messages = expoTokens.map(token => ({
        to: token,
        sound: 'default',
        title,
        body,
        data,
      }));

      await axios.post('https://exp.host/--/api/v2/push/send', messages, {
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
          'Authorization': EXPO_PUSH_ACCESS_TOKEN ? `Bearer ${EXPO_PUSH_ACCESS_TOKEN}` : undefined,
        },
      });
    }
  } catch (e) {
    console.error('Error sending push notification:', e?.response?.data || e.message);
  }
};

/**
 * Dedups and creates a story like notification
 */
const createStoryLikeNotificationIfNeeded = async ({ recipientId, storyId, likerProfile }) => {
  if (!recipientId || !storyId || !likerProfile?.id) return;
  if (String(recipientId) === String(likerProfile.id)) return;

  const dedupSinceIso = new Date(Date.now() - STORY_LIKE_NOTIFICATION_DEDUP_MS).toISOString();

  // Deduplication check
  const snapshot = await db.collection('events')
    .where('user_id', '==', recipientId)
    .where('event_type', '==', 'STORY_NOTIFICATION')
    .where('event_name', '==', 'STORY_LIKED')
    .where('created_at', '>=', dedupSinceIso)
    .get();

  const isDuplicate = snapshot.docs.some(doc => {
    const meta = doc.data().metadata;
    return meta && meta.story_id === String(storyId) && meta.liker_id === String(likerProfile.id);
  });

  if (isDuplicate) return;

  const likerName = String(likerProfile.name || 'Un utilisateur');
  const likerPhoto = Array.isArray(likerProfile.photos) ? (likerProfile.photos[0] || null) : null;

  await db.collection('events').add({
    user_id: recipientId,
    event_type: 'STORY_NOTIFICATION',
    event_name: 'STORY_LIKED',
    created_at: new Date().toISOString(),
    metadata: {
      title: 'Story likée',
      message: `${likerName} a aimé votre story.`,
      story_id: String(storyId),
      liker_id: String(likerProfile.id),
      liker_name: likerName,
      liker_photo: likerPhoto,
      is_read: false,
    },
  });

  void sendPushNotification(recipientId, 'Story likée', `${likerName} a aimé votre story.`, { storyId, type: 'STORY_LIKE' });
};

module.exports = { sendPushNotification, createStoryLikeNotificationIfNeeded };
