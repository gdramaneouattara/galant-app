const { db } = require('../config/firebase');
const { legacyEventToNotification } = require('../services/notificationCenterService');

const MAX_QUERY_PAGES = 8;
const QUERY_PAGE_SIZE = 100;
const WRITE_BATCH_SIZE = 450;
const LEGACY_PREFIX = 'legacy_event_';

const filterNotification = (item, { type, unreadOnly }) => (
  !item.archived_at &&
  (type === 'ALL' || item.type === type) &&
  (!unreadOnly || item.is_read !== true)
);

const isLegacyNotificationEvent = (item = {}) => (
  item.event_type === 'ADMIN_NOTIFICATION' || item.event_type === 'STORY_NOTIFICATION'
);

const collectNotificationDocs = async ({ query, mapper, predicate, limit }) => {
  const results = [];
  let offset = 0;
  let page = 0;

  while (results.length < limit && page < MAX_QUERY_PAGES) {
    const pageQuery = query.offset(offset).limit(QUERY_PAGE_SIZE);
    const snapshot = await pageQuery.get();
    if (snapshot.empty) break;

    snapshot.docs.forEach((doc) => {
      if (results.length >= limit) return;
      const item = mapper(doc);
      if (item && predicate(item)) results.push(item);
    });

    offset += snapshot.size;
    if (snapshot.size < QUERY_PAGE_SIZE) break;
    page += 1;
  }

  return results;
};

const sortByCreatedAtDesc = (left, right) => (
  String(right.created_at || '').localeCompare(String(left.created_at || ''))
);

const commitUpdatesInChunks = async (updates) => {
  for (let index = 0; index < updates.length; index += WRITE_BATCH_SIZE) {
    const batch = db.batch();
    updates.slice(index, index + WRITE_BATCH_SIZE).forEach(({ ref, data }) => {
      batch.update(ref, data);
    });
    await batch.commit();
  }
};

const countMatchingDocs = async ({ query, mapper, predicate, maxPages = 20 }) => {
  let count = 0;
  let offset = 0;
  let page = 0;

  while (page < maxPages) {
    const pageQuery = query.offset(offset).limit(QUERY_PAGE_SIZE);
    const snapshot = await pageQuery.get();
    if (snapshot.empty) break;

    snapshot.docs.forEach((doc) => {
      const item = mapper(doc);
      if (item && predicate(item)) count += 1;
    });

    offset += snapshot.size;
    if (snapshot.size < QUERY_PAGE_SIZE) break;
    page += 1;
  }

  return count;
};

const getNotifications = async (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
  try {
    const type = String(req.query.type || 'ALL').trim().toUpperCase();
    const unreadOnly = String(req.query.unreadOnly || '').toLowerCase() === 'true';

    const predicate = (item) => filterNotification(item, { type, unreadOnly });
    const [nextNotifications, legacyNotifications] = await Promise.all([
      collectNotificationDocs({
        query: db.collection('notifications')
          .where('user_id', '==', req.user.id),
        mapper: (doc) => ({ id: doc.id, ...doc.data() }),
        predicate,
        limit: QUERY_PAGE_SIZE * MAX_QUERY_PAGES
      }),
      collectNotificationDocs({
        query: db.collection('events')
          .where('user_id', '==', req.user.id),
        mapper: (doc) => {
          const data = doc.data();
          if (!isLegacyNotificationEvent(data)) return null;
          return legacyEventToNotification(doc);
        },
        predicate,
        limit: QUERY_PAGE_SIZE * MAX_QUERY_PAGES
      })
    ]);

    const notifications = [...nextNotifications, ...legacyNotifications]
      .sort(sortByCreatedAtDesc)
      .slice(0, limit);

    const unreadCount = notifications.filter((item) => !item.is_read).length;
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const [nextUnread, legacyUnread] = await Promise.all([
      countMatchingDocs({
        query: db.collection('notifications')
          .where('user_id', '==', req.user.id),
        mapper: (doc) => ({ id: doc.id, ...doc.data() }),
        predicate: (item) => item.is_read !== true && !item.archived_at
      }),
      countMatchingDocs({
        query: db.collection('events')
          .where('user_id', '==', req.user.id),
        mapper: (doc) => {
          const data = doc.data();
          if (!isLegacyNotificationEvent(data)) return null;
          return legacyEventToNotification(doc);
        },
        predicate: (item) => !!item && !item.is_read && !item.archived_at
      }),
    ]);

    res.json({ unreadCount: nextUnread + legacyUnread });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const markAsRead = async (req, res) => {
  const id = req.params.id;
  try {
    const notificationRef = db.collection('notifications').doc(id);
    const notificationDoc = await notificationRef.get();
    if (notificationDoc.exists) {
      if (notificationDoc.data().user_id !== req.user.id) return res.status(404).json({ error: 'not_found' });
      await notificationRef.update({ is_read: true, read_at: new Date().toISOString() });
      return res.json({ success: true });
    }

    if (String(id).startsWith(LEGACY_PREFIX)) {
      const eventId = String(id).replace(new RegExp(`^${LEGACY_PREFIX}`), '');
      const ref = db.collection('events').doc(eventId);
      const doc = await ref.get();
      if (!doc.exists || doc.data().user_id !== req.user.id) return res.status(404).json({ error: 'not_found' });

      const item = doc.data();
      const nextMetadata = { ...(item.metadata || {}), is_read: true, read_at: new Date().toISOString() };
      await ref.update({ metadata: nextMetadata, is_read: true });
      return res.json({ success: true });
    }

    res.status(404).json({ error: 'not_found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const now = new Date().toISOString();
    let processed = 0;
    let notificationOffset = 0;

    while (true) {
      const notificationSnapshot = await db.collection('notifications')
        .where('user_id', '==', req.user.id)
        .offset(notificationOffset)
        .limit(WRITE_BATCH_SIZE)
        .get();

      if (notificationSnapshot.empty) break;

      const unreadDocs = notificationSnapshot.docs.filter((doc) => {
        const item = doc.data();
        return item.is_read !== true && !item.archived_at;
      });

      if (unreadDocs.length > 0) {
        await commitUpdatesInChunks(unreadDocs.map((doc) => ({
          ref: doc.ref,
          data: { is_read: true, read_at: now }
        })));
        processed += unreadDocs.length;
      }

      notificationOffset += notificationSnapshot.size;
      if (notificationSnapshot.size < WRITE_BATCH_SIZE) break;
    }

    let eventOffset = 0;
    while (true) {
      const eventSnapshot = await db.collection('events')
        .where('user_id', '==', req.user.id)
        .offset(eventOffset)
        .limit(WRITE_BATCH_SIZE)
        .get();
      if (eventSnapshot.empty) break;

      const unreadDocs = eventSnapshot.docs.filter((doc) => {
        const item = doc.data();
        return item.is_read !== true && item.metadata?.is_read !== true && !item.metadata?.archived_at;
      });

      if (unreadDocs.length > 0) {
        await commitUpdatesInChunks(unreadDocs.map((doc) => {
          const item = doc.data();
          return {
            ref: doc.ref,
            data: {
              is_read: true,
              metadata: { ...(item.metadata || {}), is_read: true, read_at: now }
            }
          };
        }));
        processed += unreadDocs.length;
      }

      eventOffset += eventSnapshot.size;
      if (eventSnapshot.size < WRITE_BATCH_SIZE) break;
    }

    res.json({ success: true, processed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const archiveNotification = async (req, res) => {
  const id = req.params.id;
  try {
    const now = new Date().toISOString();
    const notificationRef = db.collection('notifications').doc(id);
    const notificationDoc = await notificationRef.get();
    if (notificationDoc.exists) {
      if (notificationDoc.data().user_id !== req.user.id) return res.status(404).json({ error: 'not_found' });
      await notificationRef.update({ is_read: true, read_at: notificationDoc.data().read_at || now, archived_at: now });
      return res.json({ success: true });
    }

    if (String(id).startsWith(LEGACY_PREFIX)) {
      const eventId = String(id).replace(new RegExp(`^${LEGACY_PREFIX}`), '');
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

    res.status(404).json({ error: 'not_found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead, archiveNotification };
