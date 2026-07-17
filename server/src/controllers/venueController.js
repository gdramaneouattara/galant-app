const { db } = require('../config/firebase');
const { getLatestActiveSubscriptionForUser } = require('../services/subscriptionService');

const getVenues = async (req, res) => {
  const { city, type } = req.query;
  try {
    let query = db.collection('venues').where('status', '==', 'APPROVED');
    if (type) query = query.where('venue_type', '==', type);

    const snapshot = await query.get();
    let venues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (city) {
      const searchCity = city.toLowerCase();
      venues = venues.filter(v => (v.city || '').toLowerCase().includes(searchCity));
    }

    res.json({ venues });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getVenueRecommendations = async (req, res) => {
  const me = req.user;
  const interests = me.interests || [];
  try {
    const snapshot = await db.collection('venues').where('status', '==', 'APPROVED').limit(20).get();
    let venues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (interests.length > 0) {
      venues.sort((a, b) => {
        const aMatch = interests.some(i => (a.description || '').toLowerCase().includes(i.toLowerCase()));
        const bMatch = interests.some(i => (b.description || '').toLowerCase().includes(i.toLowerCase()));
        return (bMatch ? 1 : 0) - (aMatch ? 1 : 0);
      });
    }

    res.json({ venues: venues.slice(0, 5) });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getAgendaEvents = async (req, res) => {
  const { city, type } = req.query;
  const meId = req.user.id;
  const now = new Date().toISOString();
  try {
    let query = db.collection('venue_events').where('expires_at', '>', now);
    if (type) query = query.where('event_type', '==', type);

    const snapshot = await query.orderBy('expires_at').orderBy('starts_at').get();
    let events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const results = await Promise.all(events.map(async ev => {
      const venueDoc = await db.collection('venues').doc(ev.venue_id).get();
      const venueData = venueDoc.exists ? venueDoc.data() : null;
      if (city && venueData && !venueData.city.toLowerCase().includes(city.toLowerCase())) return null;

      const attendanceSnap = await db.collection('event_attendance').where('event_id', '==', ev.id).get();
      const attendeesCount = attendanceSnap.size;
      const isAttending = attendanceSnap.docs.some(d => d.data().user_id === meId);

      return { ...ev, venues: venueData, attendees_count: attendeesCount, is_attending: isAttending };
    }));

    res.json({ events: results.filter(Boolean) });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const attendEvent = async (req, res) => {
  const { id } = req.params;
  const meId = req.user.id;
  try {
    const eventDoc = await db.collection('venue_events').doc(id).get();
    if (!eventDoc.exists) return res.status(404).json({ error: 'event_not_found' });

    await db.collection('event_attendance').doc(`${id}_${meId}`).set({
      event_id: id,
      user_id: meId,
      created_at: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const unattendEvent = async (req, res) => {
  const { id } = req.params;
  const meId = req.user.id;
  try {
    await db.collection('event_attendance').doc(`${id}_${meId}`).delete();
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const createPartnerEvent = async (req, res) => {
  const { title, description, photoUrl, eventType, startsAt, expiresAt } = req.body;
  try {
    const venueSnap = await db.collection('venues').where('owner_id', '==', req.user.id).limit(1).get();
    if (venueSnap.empty) return res.status(403).json({ error: 'not_a_partner' });
    const venue = venueSnap.docs[0];

    const sub = await getLatestActiveSubscriptionForUser(req.user.id);
    if (sub?.payment_method === 'TRIAL') {
      const activeEvents = await db.collection('venue_events')
        .where('venue_id', '==', venue.id)
        .where('expires_at', '>', new Date().toISOString())
        .get();
      if (activeEvents.size >= 1) return res.status(403).json({ error: 'trial_limit_reached' });
    }

    const eventData = { venue_id: venue.id, title, description, photo_url: photoUrl, event_type: eventType, starts_at: startsAt, expires_at: expiresAt, created_at: new Date().toISOString() };
    const ref = await db.collection('venue_events').add(eventData);
    res.json({ success: true, event: { id: ref.id, ...eventData } });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const deletePartnerEvent = async (req, res) => {
  const { id } = req.params;
  try {
    const eventRef = db.collection('venue_events').doc(id);
    const eventDoc = await eventRef.get();
    if (!eventDoc.exists) return res.status(404).json({ error: 'event_not_found' });

    const venueDoc = await db.collection('venues').doc(eventDoc.data().venue_id).get();
    if (venueDoc.data().owner_id !== req.user.id) return res.status(403).json({ error: 'unauthorized' });

    await eventRef.delete();
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const createVenueChatThread = async (req, res) => {
  const { id } = req.params;
  const meId = req.user.id;
  try {
    const chatSnap = await db.collection('venue_chats').where('user_id', '==', meId).where('venue_id', '==', id).limit(1).get();
    if (!chatSnap.empty) return res.json({ venueChatId: chatSnap.docs[0].id });

    const ref = await db.collection('venue_chats').add({ user_id: meId, venue_id: id, created_at: new Date().toISOString() });
    res.json({ venueChatId: ref.id });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getPartnerChats = async (req, res) => {
  try {
    const venueSnap = await db.collection('venues').where('owner_id', '==', req.user.id).limit(1).get();
    if (venueSnap.empty) return res.status(403).json({ error: 'not_a_partner' });
    const venueId = venueSnap.docs[0].id;

    const chatsSnap = await db.collection('venue_chats').where('venue_id', '==', venueId).orderBy('created_at', 'desc').get();
    const chats = await Promise.all(chatsSnap.docs.map(async doc => {
      const data = doc.data();
      const userDoc = await db.collection('profiles').doc(data.user_id).get();
      return { id: doc.id, ...data, profiles: userDoc.exists ? userDoc.data() : null };
    }));
    res.json({ chats });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getUserVenueChats = async (req, res) => {
  try {
    const snapshot = await db.collection('venue_chats').where('user_id', '==', req.user.id).orderBy('created_at', 'desc').get();
    const chats = await Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data();
      const venueDoc = await db.collection('venues').doc(data.venue_id).get();
      return { id: doc.id, ...data, venues: venueDoc.exists ? venueDoc.data() : null };
    }));
    res.json({ chats });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getMyVenue = async (req, res) => {
  try {
    const snapshot = await db.collection('venues').where('owner_id', '==', req.user.id).get();
    res.json({ venues: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const updateVenue = async (req, res) => {
  const { venueId, name, description, benefit, address, city } = req.body;
  try {
    const ref = db.collection('venues').doc(venueId);
    const doc = await ref.get();
    if (!doc.exists || doc.data().owner_id !== req.user.id) return res.status(403).json({ error: 'unauthorized' });

    await ref.update({ name, description, benefit_description: benefit, address, city, updated_at: new Date().toISOString() });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const updateVenuePhotos = async (req, res) => {
  const { venueId, photos } = req.body;
  try {
    const ref = db.collection('venues').doc(venueId);
    const doc = await ref.get();
    if (!doc.exists || doc.data().owner_id !== req.user.id) return res.status(403).json({ error: 'unauthorized' });

    await ref.update({ photos, photo_url: photos[0] || null });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getVenueStats = async (req, res) => {
  const { venueId } = req.params;
  try {
    const statsSnap = await db.collection('venue_analytics').where('venue_id', '==', venueId).get();
    res.json({ totalViews: statsSnap.size, weeklyHistory: [] }); // Simplified for migration
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const logVenueView = async (req, res) => {
  const { id } = req.params;
  try {
    await db.collection('venue_analytics').add({ venue_id: id, viewer_id: req.user.id, created_at: new Date().toISOString() });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

module.exports = {
  getVenues, getVenueRecommendations, getAgendaEvents, createPartnerEvent, deletePartnerEvent,
  createVenueChatThread, getPartnerChats, getUserVenueChats, getMyVenue, updateVenue,
  updateVenuePhotos, getVenueStats, logVenueView, attendEvent, unattendEvent
};
