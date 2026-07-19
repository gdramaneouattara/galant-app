const { db } = require('../config/firebase');

const getNotifications = async (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
  try {
    const snapshot = await db.collection('events')
      .where('user_id', '==', req.user.id)
      .where('event_type', 'in', ['ADMIN_NOTIFICATION', 'STORY_NOTIFICATION'])
      .orderBy('created_at', 'desc')
      .limit(limit)
      .get();

    const notifications = snapshot.docs.map((doc) => {
      const item = doc.data();
      return {
        id: doc.id,
        ...item,
        is_read: item.metadata?.is_read === true,
      };
    });

    const unreadCount = notifications.filter((item) => !item.is_read).length;
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const markAsRead = async (req, res) => {
  const id = req.params.id;
  try {
    const ref = db.collection('events').doc(id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().user_id !== req.user.id) return res.status(404).json({ error: 'not_found' });

    const item = doc.data();
    const nextMetadata = { ...(item.metadata || {}), is_read: true, read_at: new Date().toISOString() };
    await ref.update({ metadata: nextMetadata });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const snapshot = await db.collection('events')
      .where('user_id', '==', req.user.id)
      .where('event_type', 'in', ['ADMIN_NOTIFICATION', 'STORY_NOTIFICATION'])
      .get();

    if (snapshot.empty) return res.json({ success: true });

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      const item = doc.data();
      batch.update(doc.ref, {
        metadata: { ...(item.metadata || {}), is_read: true, read_at: new Date().toISOString() }
      });
    });

    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };
