const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');
const { getLatestActiveSubscriptionForUser } = require('../services/subscriptionService');
const { hasDirectMessagePurchase } = require('../services/usageService');
const {
  searchUserPartnerDiscovery,
  buildGooglePhotoMediaUrl,
  extractGooglePhotoNameFromUrl,
  GOOGLE_VENUE_PLACEHOLDER
} = require('../services/googleMapsService');
const { syncTikeramaAgendaIfNeeded } = require('../services/tikeramaAgendaService');

const PARTNER_DISCOVERY_PRICE = 500;

const googlePhotoNameForVenue = (venue = {}) => (
  venue.google_photo_name || extractGooglePhotoNameFromUrl(venue.photo_url)
);

const publicBaseUrl = (req) => {
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('host');
  return `${proto}://${host}`;
};

const venuePhotoEndpoint = (req, venueId, size) => (
  `${publicBaseUrl(req)}/api/venues/${encodeURIComponent(venueId)}/photo?size=${size}`
);

const decorateVenueMedia = (req, venue, preferred = 'thumb') => {
  const googlePhotoName = googlePhotoNameForVenue(venue);
  const isGoogleVenue = String(venue.source || '').startsWith('GOOGLE_PLACES') || !!venue.google_place_id;

  if (!isGoogleVenue || !googlePhotoName || !venue.id) {
    return venue;
  }

  const thumb = venuePhotoEndpoint(req, venue.id, 'thumb');
  const medium = venuePhotoEndpoint(req, venue.id, 'medium');
  const full = venuePhotoEndpoint(req, venue.id, 'full');
  const primary = preferred === 'medium' ? medium : preferred === 'full' ? full : thumb;

  return {
    ...venue,
    image_source: venue.image_source || 'google_places',
    google_photo_name: googlePhotoName,
    photo_url: primary,
    photo_variants: {
      ...(venue.photo_variants || {}),
      [primary]: { thumb, medium, full },
    },
  };
};

const toPublicProfile = (p) => {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    age: p.age,
    bio: p.bio,
    photos: p.photos,
    photo_variants: p.photo_variants || {},
    city: p.city,
    gender: p.gender,
    is_verified: p.is_verified,
    is_premium: p.is_premium,
    galanterie_score: p.galanterie_score,
    boosted_until: p.boosted_until || null,
    is_vip: p.is_vip || false
  };
};

const getVenues = async (req, res) => {
  const { city, type } = req.query;
  try {
    let query = db.collection('venues').where('status', '==', 'APPROVED');
    if (type) query = query.where('venue_type', '==', type);

    const snapshot = await query.get();
    let venues = snapshot.docs.map(doc => decorateVenueMedia(req, { id: doc.id, ...doc.data() }, 'thumb'));

    if (city) {
      const searchCity = city.toLowerCase();
      venues = venues.filter(v => (v.city || '').toLowerCase().includes(searchCity));
    }

    res.json({ venues });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getVenueById = async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await db.collection('venues').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'venue_not_found' });

    const venue = doc.data();
    if (venue.status && venue.status !== 'APPROVED') {
      return res.status(403).json({ error: 'venue_not_available' });
    }

    res.json({ venue: decorateVenueMedia(req, { id: doc.id, ...venue }, 'medium') });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getVenueRecommendations = async (req, res) => {
  const me = req.user;
  const interests = me.interests || [];
  try {
    const snapshot = await db.collection('venues').where('status', '==', 'APPROVED').limit(20).get();
    let venues = snapshot.docs.map(doc => decorateVenueMedia(req, { id: doc.id, ...doc.data() }, 'thumb'));

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

const getVenuePhoto = async (req, res) => {
  const { id } = req.params;
  const size = ['thumb', 'medium', 'full'].includes(String(req.query.size || '')) ? req.query.size : 'medium';

  try {
    const doc = await db.collection('venues').doc(id).get();
    if (!doc.exists) return res.redirect(GOOGLE_VENUE_PLACEHOLDER);

    const venue = doc.data();
    if (venue.status && venue.status !== 'APPROVED') return res.redirect(GOOGLE_VENUE_PLACEHOLDER);

    const googlePhotoName = googlePhotoNameForVenue(venue);
    const url = googlePhotoName ? buildGooglePhotoMediaUrl(googlePhotoName, size) : (venue.photo_url || GOOGLE_VENUE_PLACEHOLDER);

    res.set('Cache-Control', 'public, max-age=21600, stale-while-revalidate=86400');
    return res.redirect(302, url);
  } catch (error) {
    return res.redirect(GOOGLE_VENUE_PLACEHOLDER);
  }
};

const canUsePartnerDiscovery = (profile = {}) => (
  !!profile.is_premium ||
  !!profile.is_vip ||
  !!profile.partner_discovery_unlocked
);

const getPartnerDiscoveryAccess = async (req, res) => {
  res.json({
    hasAccess: canUsePartnerDiscovery(req.user),
    requiresPayment: !canUsePartnerDiscovery(req.user),
    priceAmount: PARTNER_DISCOVERY_PRICE,
    purchaseType: 'PARTNER_DISCOVERY_UNLOCK'
  });
};

const discoverGooglePartners = async (req, res) => {
  if (!canUsePartnerDiscovery(req.user)) {
    return res.status(403).json({
      error: 'payment_required',
      message: 'partner_discovery_requires_payment',
      priceAmount: PARTNER_DISCOVERY_PRICE,
      purchaseType: 'PARTNER_DISCOVERY_UNLOCK'
    });
  }

  const city = String(req.query.city || req.user.city || '').trim();
  const latitude = req.query.latitude ?? req.user.latitude;
  const longitude = req.query.longitude ?? req.user.longitude;
  const radiusKm = Math.max(1, Math.min(50, Number(req.query.radiusKm || 15)));
  const category = String(req.query.category || 'ALL').trim().toUpperCase();

  if (!city && (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude)))) {
    return res.status(400).json({ error: 'missing_city_or_location' });
  }

  try {
    const venues = await searchUserPartnerDiscovery({
      city,
      latitude,
      longitude,
      radiusKm,
      limit: 20,
      category
    });

    res.json({
      venues,
      source: 'GOOGLE_PLACES_DIRECT',
      city: city || null,
      category,
      radiusKm,
      access: {
        includedWithPremium: !!(req.user.is_premium || req.user.is_vip),
        unlocked: !!req.user.partner_discovery_unlocked
      }
    });
  } catch (error) {
    const payload = { error: error.message };
    if (error.details) payload.details = error.details;
    if (error.googleStatus) payload.googleStatus = error.googleStatus;
    if (error.googleCode) payload.googleCode = error.googleCode;
    if (error.categoryErrors) payload.categoryErrors = error.categoryErrors;
    res.status(500).json(payload);
  }
};

const getAgendaEvents = async (req, res) => {
  const { city, type } = req.query;
  const meId = req.user.id;
  const now = new Date().toISOString();
  try {
    const forceExternalRefresh = req.query.refreshExternal === '1' && req.user?.is_admin === true;
    await syncTikeramaAgendaIfNeeded({
      force: forceExternalRefresh,
      maxEvents: forceExternalRefresh ? undefined : 4,
      maxListingPaths: forceExternalRefresh ? undefined : 1,
      requestTimeoutMs: forceExternalRefresh ? undefined : 5000,
    }).catch(error => {
      console.warn('[agenda] external_sync_failed', error.message);
    });

    let query = db.collection('venue_events').where('expires_at', '>', now);
    if (type) query = query.where('event_type', '==', type);

    const snapshot = await query.get();
    let events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => String(a.starts_at || a.expires_at || '').localeCompare(String(b.starts_at || b.expires_at || '')));

    const results = await Promise.all(events.map(async ev => {
      const venueDoc = await db.collection('venues').doc(ev.venue_id).get();
      const venueData = venueDoc.exists ? decorateVenueMedia(req, { id: venueDoc.id, ...venueDoc.data() }, 'thumb') : null;
      if (!venueData) return null;
      if (city && !String(venueData.city || '').toLowerCase().includes(String(city).toLowerCase())) return null;

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
  const { title, description, photoUrl, photoVariants, eventType, startsAt, expiresAt } = req.body;
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

    const eventData = {
      venue_id: venue.id,
      title,
      description,
      photo_url: photoUrl,
      photo_variants: photoUrl && photoVariants?.[photoUrl] ? { [photoUrl]: photoVariants[photoUrl] } : {},
      event_type: eventType,
      starts_at: startsAt,
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    };
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
    const venueDoc = await db.collection('venues').doc(id).get();
    if (!venueDoc.exists) return res.status(404).json({ error: 'venue_not_found' });

    const venue = venueDoc.data();
    if (venue.status && venue.status !== 'APPROVED') return res.status(403).json({ error: 'venue_not_available' });
    if (venue.owner_id === meId) return res.status(400).json({ error: 'cannot_chat_own_venue' });

    const chatSnap = await db.collection('venue_chats').where('user_id', '==', meId).where('venue_id', '==', id).limit(1).get();
    if (!chatSnap.empty) return res.json({ venueChatId: chatSnap.docs[0].id });

    const profileRef = db.collection('profiles').doc(meId);
    const profileSnap = await profileRef.get();
    const profile = profileSnap.exists ? profileSnap.data() : {};
    const hasPremiumAccess = !!(profile?.is_premium || profile?.is_vip || req.user?.is_premium || req.user?.is_vip);
    const purchased = await hasDirectMessagePurchase(meId, id);
    const roseBalance = Number(profile?.rose_balance || 0);
    const now = new Date().toISOString();
    const chatRef = db.collection('venue_chats').doc(`vchat_${meId}_${id}`);

    if (!hasPremiumAccess && !purchased && roseBalance < 1) {
      return res.status(403).json({
        error: 'payment_required',
        message: 'partner_contact_requires_payment'
      });
    }

    if (!hasPremiumAccess && !purchased) {
      await db.runTransaction(async (tx) => {
        const existingChat = await tx.get(chatRef);
        if (existingChat.exists) return;

        const freshProfileSnap = await tx.get(profileRef);
        const freshRoseBalance = Number(freshProfileSnap.data()?.rose_balance || 0);
        if (freshRoseBalance < 1) {
          const error = new Error('partner_contact_requires_payment');
          error.code = 'payment_required';
          throw error;
        }

        tx.update(profileRef, {
          rose_balance: FieldValue.increment(-1),
          updated_at: now
        });
        tx.set(chatRef, { user_id: meId, venue_id: id, created_at: now, unlocked_with_rose: true });
      });
      return res.json({ venueChatId: chatRef.id });
    }

    await chatRef.set({ user_id: meId, venue_id: id, created_at: now, unlocked_with_purchase: purchased, unlocked_with_premium: hasPremiumAccess });
    res.json({ venueChatId: chatRef.id });
  } catch (error) {
    if (error?.code === 'payment_required') {
      return res.status(403).json({ error: 'payment_required', message: 'partner_contact_requires_payment' });
    }
    res.status(500).json({ error: error.message });
  }
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
      return { id: doc.id, ...data, profiles: userDoc.exists ? toPublicProfile({ id: userDoc.id, ...userDoc.data() }) : null };
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
      return { id: doc.id, ...data, venues: venueDoc.exists ? decorateVenueMedia(req, { id: venueDoc.id, ...venueDoc.data() }, 'thumb') : null };
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
  const { venueId, photos, photo_variants } = req.body;
  try {
    const ref = db.collection('venues').doc(venueId);
    const doc = await ref.get();
    if (!doc.exists || doc.data().owner_id !== req.user.id) return res.status(403).json({ error: 'unauthorized' });

    const nextPhotos = Array.isArray(photos) ? photos.slice(0, 6) : [];
    const nextVariants = nextPhotos.reduce((acc, photoUrl) => {
      const variants = photo_variants?.[photoUrl];
      if (variants && typeof variants === 'object') {
        acc[photoUrl] = {
          full: variants.full || photoUrl,
          medium: variants.medium || photoUrl,
          thumb: variants.thumb || variants.medium || photoUrl,
        };
      }
      return acc;
    }, {});

    await ref.update({ photos: nextPhotos, photo_url: nextPhotos[0] || null, photo_variants: nextVariants });
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
  getVenues, getVenueById, getVenueRecommendations, getVenuePhoto, getPartnerDiscoveryAccess, discoverGooglePartners,
  getAgendaEvents, createPartnerEvent, deletePartnerEvent,
  createVenueChatThread, getPartnerChats, getUserVenueChats, getMyVenue, updateVenue,
  updateVenuePhotos, getVenueStats, logVenueView, attendEvent, unattendEvent
};
