const { db } = require('../config/firebase');

const NOTIFICATION_TYPES = {
  MESSAGE: 'MESSAGE',
  LIKE_RECEIVED: 'LIKE_RECEIVED',
  ROSE_RECEIVED: 'ROSE_RECEIVED',
  STORY_LIKED: 'STORY_LIKED',
  MATCH_CREATED: 'MATCH_CREATED',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  ADMIN: 'ADMIN',
  SECURITY: 'SECURITY',
  PARTNER: 'PARTNER',
  AGENDA: 'AGENDA',
};

const routeForNotification = ({ type, targetId, metadata = {} }) => {
  switch (type) {
    case NOTIFICATION_TYPES.MESSAGE:
      return metadata.venue_chat_id ? `/chat/${metadata.venue_chat_id}` : `/chat/${targetId || metadata.match_id || ''}`;
    case NOTIFICATION_TYPES.LIKE_RECEIVED:
      return '/likes';
    case NOTIFICATION_TYPES.ROSE_RECEIVED:
      return '/roses';
    case NOTIFICATION_TYPES.STORY_LIKED:
      return metadata.story_id ? `/stories?story=${encodeURIComponent(metadata.story_id)}` : '/stories';
    case NOTIFICATION_TYPES.MATCH_CREATED:
      return targetId ? `/chat/${targetId}` : '/matches';
    case NOTIFICATION_TYPES.PAYMENT_SUCCESS:
    case NOTIFICATION_TYPES.PAYMENT_FAILED:
      return metadata.next_route || '/profile';
    case NOTIFICATION_TYPES.PARTNER:
      return metadata.venue_chat_id ? `/chat/${metadata.venue_chat_id}` : '/partner';
    case NOTIFICATION_TYPES.AGENDA:
      return metadata.event_id ? `/agenda?event=${encodeURIComponent(metadata.event_id)}` : '/agenda';
    case NOTIFICATION_TYPES.SECURITY:
    case NOTIFICATION_TYPES.ADMIN:
    default:
      return metadata.target_route || '/notifications';
  }
};

const normalizePayload = ({
  userId,
  type,
  title,
  message,
  targetId = null,
  targetRoute = null,
  metadata = {},
}) => {
  const normalizedType = String(type || NOTIFICATION_TYPES.ADMIN).trim().toUpperCase();
  const safeMetadata = metadata && typeof metadata === 'object' ? metadata : {};
  return {
    user_id: userId,
    type: normalizedType,
    title: String(title || 'Galant'),
    message: String(message || ''),
    target_id: targetId || safeMetadata.target_id || null,
    target_route: targetRoute || routeForNotification({ type: normalizedType, targetId, metadata: safeMetadata }),
    metadata: safeMetadata,
    is_read: false,
    read_at: null,
    archived_at: null,
    created_at: new Date().toISOString(),
  };
};

const dedupeDocId = (dedupeKey) => (
  String(dedupeKey).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 180)
);

const createInternalNotification = async ({
  userId,
  type,
  title,
  message,
  targetId = null,
  targetRoute = null,
  metadata = {},
  dedupeKey = null,
  sendPush = true,
  awaitPush = false,
  pushData = {},
}) => {
  if (!userId) return null;

  try {
    const payload = normalizePayload({ userId, type, title, message, targetId, targetRoute, metadata });
    const collection = db.collection('notifications');

    let ref = collection.doc();
    if (dedupeKey) {
      ref = collection.doc(dedupeDocId(dedupeKey));
      const created = await db.runTransaction(async (tx) => {
        const existing = await tx.get(ref);
        if (existing.exists) return false;
        tx.set(ref, payload);
        return true;
      });

      if (!created) return { id: ref.id, duplicate: true };
    } else {
      await ref.set(payload);
    }

    if (sendPush) {
      // Lazy require avoids a circular dependency with notificationService.
      const { sendPushNotification } = require('./notificationService');
      const pushPromise = sendPushNotification(userId, payload.title, payload.message, {
        type: payload.type,
        notificationId: ref.id,
        targetRoute: payload.target_route,
        targetId: payload.target_id || '',
        ...pushData,
      }).catch((error) => {
        console.warn('[notification_center] push_failed', error.message);
      });
      if (awaitPush) await pushPromise;
      else void pushPromise;
    }

    return { id: ref.id, ...payload };
  } catch (error) {
    console.warn('[notification_center] write_failed', error.message);
    return null;
  }
};

const legacyEventToNotification = (doc) => {
  const item = doc.data();
  const metadata = item.metadata || {};
  const type = item.event_type === 'STORY_NOTIFICATION'
    ? NOTIFICATION_TYPES.STORY_LIKED
    : NOTIFICATION_TYPES.ADMIN;

  return {
    id: `legacy_event_${doc.id}`,
    legacy_event_id: doc.id,
    user_id: item.user_id,
    type,
    title: metadata.title || item.event_name || 'Galant',
    message: metadata.message || '',
    target_id: metadata.target_id || metadata.story_id || null,
    target_route: metadata.target_route || routeForNotification({ type, targetId: metadata.target_id, metadata }),
    metadata,
    is_read: metadata.is_read === true || item.is_read === true,
    read_at: metadata.read_at || null,
    archived_at: metadata.archived_at || null,
    created_at: item.created_at || new Date(0).toISOString(),
    is_legacy: true,
  };
};

module.exports = {
  NOTIFICATION_TYPES,
  createInternalNotification,
  legacyEventToNotification,
  routeForNotification,
};
