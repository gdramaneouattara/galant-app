const { FieldValue } = require('firebase-admin/firestore');
const { db } = require('../config/firebase');
const { hasAdminAccess } = require('../utils/adminAccess');
const { createInternalNotification, NOTIFICATION_TYPES } = require('../services/notificationCenterService');

const SUPPORT_COLLECTION = 'support_threads';
const MESSAGE_LIMIT = 120;
const THREAD_LIMIT = 120;
const ADMIN_RECIPIENT_LIMIT = 20;

const nowIso = () => new Date().toISOString();

const cleanText = (value, maxLength = 2000) => (
  String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength)
);

const cleanMessage = (value) => String(value || '').trim().slice(0, 4000);

const publicProfile = (profile = {}) => ({
  id: profile.id || null,
  name: profile.name || profile.email || 'Utilisateur',
  email: profile.email || null,
  photo: Array.isArray(profile.photos) ? profile.photos[0] || null : null,
  role: profile.is_partner ? 'PARTNER' : profile.is_premium ? 'PREMIUM' : 'USER',
  is_premium: !!profile.is_premium,
  is_partner: !!profile.is_partner,
});

const threadRefForUser = (userId) => db.collection(SUPPORT_COLLECTION).doc(userId);

const messageToPublic = (doc) => ({ id: doc.id, ...doc.data() });

const getAdminRecipients = async () => {
  const snapshot = await db.collection('profiles')
    .where('is_admin', '==', true)
    .limit(ADMIN_RECIPIENT_LIMIT)
    .get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((profile) => hasAdminAccess(profile));
};

const notifyAdmins = async ({ userId, userName, message }) => {
  const admins = await getAdminRecipients();
  await Promise.all(admins.map((adminProfile) => createInternalNotification({
    userId: adminProfile.id,
    type: NOTIFICATION_TYPES.ADMIN,
    title: 'Nouveau message support',
    message: `${userName}: ${message.slice(0, 140)}`,
    targetId: userId,
    targetRoute: `/admin/support?thread=${encodeURIComponent(userId)}`,
    metadata: {
      support_thread_id: userId,
      target_route: `/admin/support?thread=${encodeURIComponent(userId)}`,
      sender_role: 'USER'
    },
    sendPush: true,
    pushData: { type: 'SUPPORT_USER_MESSAGE', threadId: userId }
  })));
};

const notifyUser = async ({ userId, message }) => (
  createInternalNotification({
    userId,
    type: NOTIFICATION_TYPES.ADMIN,
    title: 'Reponse du support Galant',
    message: message.slice(0, 160),
    targetId: userId,
    targetRoute: '/support',
    metadata: {
      support_thread_id: userId,
      target_route: '/support',
      sender_role: 'ADMIN'
    },
    sendPush: true,
    pushData: { type: 'SUPPORT_ADMIN_REPLY', threadId: userId }
  })
);

const getThreadMessages = async (threadId) => {
  const snapshot = await db.collection(SUPPORT_COLLECTION)
    .doc(threadId)
    .collection('messages')
    .orderBy('created_at', 'desc')
    .limit(MESSAGE_LIMIT)
    .get();

  return snapshot.docs.map(messageToPublic).reverse();
};

const getMySupportThread = async (req, res) => {
  try {
    const threadDoc = await threadRefForUser(req.user.id).get();
    if (!threadDoc.exists) return res.json({ thread: null, messages: [] });

    await threadDoc.ref.update({ unread_for_user: 0, user_read_at: nowIso() });
    const messages = await getThreadMessages(req.user.id);
    res.json({ thread: { id: threadDoc.id, ...threadDoc.data(), unread_for_user: 0 }, messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const sendUserSupportMessage = async (req, res) => {
  const message = cleanMessage(req.body?.message);
  const subject = cleanText(req.body?.subject || 'Support Galant', 120);
  if (!message) return res.status(400).json({ error: 'missing_message' });

  try {
    const timestamp = nowIso();
    const profile = publicProfile(req.user);
    const threadRef = threadRefForUser(req.user.id);
    const messageRef = threadRef.collection('messages').doc();

    await db.runTransaction(async (tx) => {
      const threadDoc = await tx.get(threadRef);
      const previous = threadDoc.exists ? threadDoc.data() : {};
      tx.set(threadRef, {
        user_id: req.user.id,
        user: profile,
        subject: previous.subject || subject,
        status: 'OPEN',
        last_message: message.slice(0, 280),
        last_message_at: timestamp,
        last_sender_role: 'USER',
        unread_for_admin: FieldValue.increment(1),
        unread_for_user: previous.unread_for_user || 0,
        created_at: previous.created_at || timestamp,
        updated_at: timestamp,
      }, { merge: true });

      tx.set(messageRef, {
        thread_id: req.user.id,
        sender_id: req.user.id,
        sender_role: 'USER',
        sender_name: profile.name,
        message,
        created_at: timestamp,
      });
    });

    void notifyAdmins({ userId: req.user.id, userName: profile.name, message }).catch((error) => {
      console.warn('[support] admin_notification_failed', error.message);
    });

    const threadDoc = await threadRef.get();
    const messages = await getThreadMessages(req.user.id);
    res.json({ success: true, thread: { id: threadDoc.id, ...threadDoc.data() }, messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const markMySupportThreadRead = async (req, res) => {
  try {
    const threadRef = threadRefForUser(req.user.id);
    const threadDoc = await threadRef.get();
    if (!threadDoc.exists) return res.json({ success: true });
    await threadRef.update({ unread_for_user: 0, user_read_at: nowIso() });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAdminSupportThreads = async (_req, res) => {
  try {
    const snapshot = await db.collection(SUPPORT_COLLECTION)
      .orderBy('last_message_at', 'desc')
      .limit(THREAD_LIMIT)
      .get();
    const threads = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ threads });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAdminSupportMessages = async (req, res) => {
  const { threadId } = req.params;
  try {
    const threadRef = db.collection(SUPPORT_COLLECTION).doc(threadId);
    const threadDoc = await threadRef.get();
    if (!threadDoc.exists) return res.status(404).json({ error: 'thread_not_found' });

    await threadRef.update({ unread_for_admin: 0, admin_read_at: nowIso() });
    const messages = await getThreadMessages(threadId);
    res.json({ thread: { id: threadDoc.id, ...threadDoc.data(), unread_for_admin: 0 }, messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const sendAdminSupportReply = async (req, res) => {
  const { threadId } = req.params;
  const message = cleanMessage(req.body?.message);
  if (!message) return res.status(400).json({ error: 'missing_message' });

  try {
    const timestamp = nowIso();
    const threadRef = db.collection(SUPPORT_COLLECTION).doc(threadId);
    const messageRef = threadRef.collection('messages').doc();

    await db.runTransaction(async (tx) => {
      const threadDoc = await tx.get(threadRef);
      if (!threadDoc.exists) throw new Error('thread_not_found');

      tx.update(threadRef, {
        status: 'OPEN',
        last_message: message.slice(0, 280),
        last_message_at: timestamp,
        last_sender_role: 'ADMIN',
        unread_for_admin: 0,
        unread_for_user: FieldValue.increment(1),
        updated_at: timestamp,
      });

      tx.set(messageRef, {
        thread_id: threadId,
        sender_id: req.user.id,
        sender_role: 'ADMIN',
        sender_name: req.user.name || req.user.email || 'Support Galant',
        message,
        created_at: timestamp,
      });
    });

    void notifyUser({ userId: threadId, message }).catch((error) => {
      console.warn('[support] user_notification_failed', error.message);
    });

    const threadDoc = await threadRef.get();
    const messages = await getThreadMessages(threadId);
    res.json({ success: true, thread: { id: threadDoc.id, ...threadDoc.data() }, messages });
  } catch (error) {
    if (error.message === 'thread_not_found') return res.status(404).json({ error: 'thread_not_found' });
    res.status(500).json({ error: error.message });
  }
};

const updateAdminSupportThreadStatus = async (req, res) => {
  const { threadId } = req.params;
  const status = String(req.body?.status || '').trim().toUpperCase();
  if (!['OPEN', 'CLOSED'].includes(status)) return res.status(400).json({ error: 'invalid_status' });

  try {
    const threadRef = db.collection(SUPPORT_COLLECTION).doc(threadId);
    const threadDoc = await threadRef.get();
    if (!threadDoc.exists) return res.status(404).json({ error: 'thread_not_found' });

    await threadRef.update({
      status,
      updated_at: nowIso(),
      closed_at: status === 'CLOSED' ? nowIso() : null,
      closed_by: status === 'CLOSED' ? req.user.id : null,
    });

    res.json({ success: true, thread: { id: threadDoc.id, ...threadDoc.data(), status } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getMySupportThread,
  sendUserSupportMessage,
  markMySupportThreadRead,
  getAdminSupportThreads,
  getAdminSupportMessages,
  sendAdminSupportReply,
  updateAdminSupportThreadStatus,
};
