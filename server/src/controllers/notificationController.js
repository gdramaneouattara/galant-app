const { db } = require('../config/firebase');
const { legacyEventToNotification } = require('../services/notificationCenterService');

const getNotifications = async (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
  try {
    const type = String(req.query.type || 'ALL').trim().toUpperCase();
    const unreadOnly = String(req.query.unreadOnly || '').toLowerCase() === 'true';

    let notificationsQuery = db.collection('notifications')
      .where('user_id', '==', req.user.id);
    notificationsQuery = notificationsQuery
      .orderBy('created_at', 'desc')
      .limit(Math.min(100, limit * 2));

    const notificationsSnapshot = await notificationsQuery.get();
    const nextNotifications = notificationsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((item) => !item.archived_at)
      .filter((item) => type === 'ALL' || item.type === type)
      .filter((item) => !unreadOnly || item.is_read !== true);

    const snapshot = await db.collection('events')
      .where('user_id', '==', req.user.id)
      .where('event_type', 'in', ['ADMIN_NOTIFICATION', 'STORY_NOTIFICATION'])
      .orderBy('created_at', 'desc')
      .limit(limit)
      .get();

    const legacyNotifications = snapshot.docs.map(legacyEventToNotification)
      .filter((item) => !item.archived_at)
      .filter((item) => type === 'ALL' || item.type === type)
      .filter((item) => !unreadOnly || item.is_read !== true);

    const notifications = [...nextNotifications, ...legacyNotifications]
      .sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || '')))
      .slice(0, limit);

    const unreadCount = notifications.filter((item) => !item.is_read).length;
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const [nextSnapshot, legacySnapshot] = await Promise.all([
      db.collection('notifications')
        .where('user_id', '==', req.user.id)
        .where('is_read', '==', false)
        .limit(100)
        .get(),
      db.collection('events')
        .where('user_id', '==', req.user.id)
        .where('event_type', 'in', ['ADMIN_NOTIFICATION', 'STORY_NOTIFICATION'])
        .limit(100)
        .get(),
    ]);

    const legacyUnread = legacySnapshot.docs
      .map(legacyEventToNotification)
      .filter((item) => !item.is_read && !item.archived_at).length;

    res.json({ unreadCount: nextSnapshot.size + legacyUnread });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const markAsRead = async (req, res) => {
  const id = req.params.id;
  try {
    if (String(id).startsWith('event_')) {
      const eventId = String(id).replace(/^event_/, '');
      const ref = db.collection('events').doc(eventId);
      const doc = await ref.get();
      if (!doc.exists || doc.data().user_id !== req.user.id) return res.status(404).json({ error: 'not_found' });

      const item = doc.data();
      const nextMetadata = { ...(item.metadata || {}), is_read: true, read_at: new Date().toISOString() };
      await ref.update({ metadata: nextMetadata, is_read: true });
      return res.json({ success: true });
    }

    const ref = db.collection('notifications').doc(id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().user_id !== req.user.id) return res.status(404).json({ error: 'not_found' });

    await ref.update({ is_read: true, read_at: new Date().toISOString() });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const [notificationSnapshot, eventSnapshot] = await Promise.all([
      db.collection('notifications')
        .where('user_id', '==', req.user.id)
        .where('is_read', '==', false)
        .limit(400)
        .get(),
      db.collection('events')
        .where('user_id', '==', req.user.id)
        .where('event_type', 'in', ['ADMIN_NOTIFICATION', 'STORY_NOTIFICATION'])
        .limit(400)
        .get()
    ]);

    if (notificationSnapshot.empty && eventSnapshot.empty) return res.json({ success: true });

    const batch = db.batch();
    notificationSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { is_read: true, read_at: new Date().toISOString() });
    });
    eventSnapshot.docs.forEach((doc) => {
      const item = doc.data();
      batch.update(doc.ref, {
        is_read: true,
        metadata: { ...(item.metadata || {}), is_read: true, read_at: new Date().toISOString() }
      });
    });

    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const archiveNotification = async (req, res) => {
  const id = req.params.id;
  try {
    const now = new Date().toISOString();
    if (String(id).startsWith('event_')) {
      const eventId = String(id).replace(/^event_/, '');
      const ref = db.collection('events').doc(eventId);
      const doc = await ref.get();
      if (!doc.exists || doc.data().user_id !== req.user.id) return res.status(404).json({ error: 'not_found' });
      const item = doc.data();
      await ref.update({
        is_read: true,
        metadata: { ...(item.metadata || {}), is_read: true, archived_at: now, read_at: item.metadata?.read_at || now }
      });
      return res.json({ success: true });
    }

    const ref = db.collection('notifications').doc(id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().user_id !== req.user.id) return res.status(404).json({ error: 'not_found' });
    await ref.update({ is_read: true, read_at: doc.data().read_at || now, archived_at: now });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead, archiveNotification };
