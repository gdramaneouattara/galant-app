const { db, admin, auth } = require('../config/firebase');
const { buildUserSegmentFilter, appendAdminAuditLog } = require('../services/accessService');
const { sendPushNotification } = require('../services/notificationService');
const { createInternalNotification, NOTIFICATION_TYPES } = require('../services/notificationCenterService');
const { processUserAction } = require('../services/conciergeService');
const { reconcileAllCounters, backfillProfileGeohashes } = require('../services/maintenanceService');
const { backfillImageVariants, backfillVideoMedia, cleanupOrphanMedia } = require('../services/mediaMaintenanceService');
const { searchVenuesInCity, ADMIN_SEEDER_CATEGORY_TYPES } = require('../services/googleMapsService');
const pricingDefaults = require('../config/constants');

const createNotificationSafely = (payload) => {
  void createInternalNotification(payload).catch((error) => {
    console.warn('[admin] notification_failed', error.message);
  });
};

const chunkRows = (rows, size) => {
  const chunks = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
};

const mergeRosePacks = (overrides = {}) => {
  const merged = {};
  const keys = new Set([...Object.keys(pricingDefaults.ROSE_PACKS), ...Object.keys(overrides || {})]);
  keys.forEach((key) => {
    merged[key] = {
      ...(pricingDefaults.ROSE_PACKS[key] || {}),
      ...(overrides?.[key] || {})
    };
  });
  return merged;
};

const getStats = async (req, res) => {
  try {
    const [profilesSnap, subsSnap, kycSnap, reportsSnap, privacySnap] = await Promise.all([
      db.collection('profiles').get(),
      db.collection('subscriptions').where('status', '==', 'active').get(),
      db.collection('kyc_verifications').get(),
      db.collection('reports').get(),
      db.collection('privacy_requests').get(),
    ]);

    const users = profilesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const activeUsers = users.filter(u => !u.suspended_at);
    const premiumUsers = users.filter(u => !!u.is_premium);
    const verifiedUsers = users.filter(u => !!u.is_verified);

    const planCounts = { MONTHLY: 0, QUARTERLY: 0, UNKNOWN: 0 };
    subsSnap.docs.forEach(doc => {
      const plan = String(doc.data().plan_id || '').toUpperCase();
      if (planCounts[plan] !== undefined) planCounts[plan]++;
      else planCounts.UNKNOWN++;
    });

    res.json({
      generatedAt: new Date().toISOString(),
      users: {
        total: users.length,
        active: activeUsers.length,
        suspended: users.length - activeUsers.length,
        admins: users.filter(u => !!u.is_admin).length,
        verified: verifiedUsers.length,
        premium: premiumUsers.length,
        male: users.filter(u => u.gender === 'MALE').length,
        female: users.filter(u => u.gender === 'FEMALE').length,
      },
      premiumByPlan: planCounts,
      kyc: {
        totalRequests: kycSnap.size,
        pending: kycSnap.docs.filter(d => d.data().status === 'PENDING').length,
      },
      moderation: {
        reportsTotal: reportsSnap.size,
        reportsOpen: reportsSnap.docs.filter(d => d.data().status === 'PENDING').length,
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPendingVenues = async (req, res) => {
  try {
    const snapshot = await db.collection('venues').where('status', '==', 'PENDING').get();
    const venues = await Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data();
      const userDoc = await db.collection('profiles').doc(data.owner_id).get();
      return { id: doc.id, ...data, profiles: userDoc.exists ? userDoc.data() : null };
    }));
    res.json({ venues });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const approveVenue = async (req, res) => {
  const { id } = req.params;
  try {
    const venueRef = db.collection('venues').doc(id);
    const venueDoc = await venueRef.get();
    if (!venueDoc.exists) return res.status(404).json({ error: 'venue_not_found' });

    const venue = venueDoc.data();
    await venueRef.update({ status: 'APPROVED' });

    await db.collection('events').add({
      user_id: venue.owner_id,
      event_type: 'ADMIN_NOTIFICATION',
      event_name: 'VENUE_APPROVED',
      created_at: new Date().toISOString(),
      metadata: { title: 'Félicitations ! 🌹', message: `Votre établissement "${venue.name}" a été approuvé.` }
    });

    createNotificationSafely({
      userId: venue.owner_id,
      type: NOTIFICATION_TYPES.PARTNER,
      title: 'Etablissement approuve',
      message: `Votre etablissement "${venue.name}" est maintenant visible dans le Guide Galant.`,
      targetId: id,
      targetRoute: '/partner',
      metadata: { venue_id: id, target_route: '/partner' },
      dedupeKey: `venue_approved_${venue.owner_id}_${id}`,
      sendPush: true,
      pushData: { type: 'VENUE_APPROVED', venueId: id }
    });

    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const reconcileProfiles = async (req, res) => {
  try {
    const profilesSnap = await db.collection('profiles').get();
    const profileIds = new Set(profilesSnap.docs.map(d => d.id));

    const authUsers = await auth.listUsers(1000);
    let createdCount = 0;

    for (const user of authUsers.users) {
      if (!profileIds.has(user.uid)) {
        await db.collection('profiles').doc(user.uid).set({
          name: user.displayName || user.email || 'Utilisateur',
          onboarding_completed: false,
          is_admin: false,
          is_verified: false,
          is_premium: false,
          created_at: new Date().toISOString()
        });
        createdCount++;
      }
    }

    res.json({ createdCount, totalAuthUsers: authUsers.users.length });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const resolvePrivacyRequest = async (req, res) => {
  const { id } = req.params;
  const { status, executeDelete } = req.body;
  try {
    const ref = db.collection('privacy_requests').doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'not_found' });

    const request = doc.data();
    await ref.update({ status, completed_at: new Date().toISOString() });

    if (executeDelete && status === 'COMPLETED' && request.request_type === 'ACCOUNT_DELETION') {
      await db.collection('profiles').doc(request.user_id).delete();
      await auth.deleteUser(request.user_id);
    }
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const reviewPhoto = async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;
  try {
    const ref = db.collection('photo_review_queue').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'not_found' });

    const data = snap.data();
    await ref.update({ status, reviewed_at: new Date().toISOString(), rejection_reason: note });
    await db.collection('profiles').doc(data.user_id).update({ photo_review_status: status });

    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const broadcastMessage = async (req, res) => {
  const { segment, title, message } = req.body;
  try {
    const profilesSnap = await db.collection('profiles').get();
    const filter = buildUserSegmentFilter(segment || 'ALL');
    const recipients = profilesSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(filter)
      .map(u => u.id);

    if (recipients.length > 0) {
      const now = new Date().toISOString();
      for (const chunk of chunkRows(recipients, 450)) {
        const batch = db.batch();
        chunk.forEach(uid => {
          const ref = db.collection('events').doc();
          batch.set(ref, {
            user_id: uid,
            event_type: 'ADMIN_NOTIFICATION',
            event_name: 'ADMIN_BROADCAST',
            created_at: now,
            metadata: { title, message, segment, is_read: false }
          });
        });
        await batch.commit();
      }

      recipients.forEach(uid => {
        void sendPushNotification(uid, title, message, { type: 'ADMIN_BROADCAST' });
      });
    }

    res.json({ success: true, recipientCount: recipients.length });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getKycRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const snapshot = await db.collection('kyc_verifications').get();
    const requests = await Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data();
      const userDoc = await db.collection('profiles').doc(data.user_id).get();
      return { id: doc.id, ...data, user: userDoc.exists ? { id: userDoc.id, ...userDoc.data() } : null };
    }));
    const filtered = requests
      .filter(r => !!r.user && (!status || status === 'ALL' || r.status === status))
      .sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || '')));
    res.json({ requests: filtered });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const reviewKyc = async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;
  try {
    const kycRef = db.collection('kyc_verifications').doc(id);
    const kycDoc = await kycRef.get();
    if (!kycDoc.exists) return res.status(404).json({ error: 'kyc_not_found' });

    const kycData = kycDoc.data();
    await kycRef.update({
      status,
      reviewed_at: new Date().toISOString(),
      rejection_reason: note || null
    });

    if (status === 'APPROVED') {
      await db.collection('profiles').doc(kycData.user_id).update({ is_verified: true });

      // Trigger Concierge IA
      processUserAction(kycData.user_id, 'BADGE_VERIFIED');

      createNotificationSafely({
        userId: kycData.user_id,
        type: NOTIFICATION_TYPES.SECURITY,
        title: 'Profil certifie',
        message: 'Votre identite a ete verifiee avec succes.',
        targetRoute: '/profile',
        metadata: { kyc_id: id, target_route: '/profile' },
        dedupeKey: `kyc_approved_${kycData.user_id}_${id}`,
        sendPush: false
      });

      void sendPushNotification(kycData.user_id, 'Profil Certifié ! 💎', 'Votre identité a été vérifiée avec succès.');
    } else if (status === 'REJECTED') {
      createNotificationSafely({
        userId: kycData.user_id,
        type: NOTIFICATION_TYPES.SECURITY,
        title: 'KYC refuse',
        message: `Votre demande a ete rejetee : ${note || 'document non valide'}`,
        targetRoute: '/verify',
        metadata: { kyc_id: id, target_route: '/verify' },
        dedupeKey: `kyc_rejected_${kycData.user_id}_${id}`,
        sendPush: false
      });

      void sendPushNotification(kycData.user_id, 'KYC Refusé', `Votre demande a été rejetée : ${note}`);
    }

    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getPhotoReviews = async (req, res) => {
  try {
    const snapshot = await db.collection('photo_review_queue').where('status', '==', 'PENDING').get();
    const reviews = await Promise.all(snapshot.docs.map(async d => {
      const data = d.data();
      const userDoc = data.user_id ? await db.collection('profiles').doc(data.user_id).get() : null;
      return {
        id: d.id,
        ...data,
        user: userDoc?.exists ? { id: userDoc.id, ...userDoc.data() } : null
      };
    }));
    res.json({ reviews });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getReports = async (req, res) => {
  try {
    const { status } = req.query;
    const snapshot = await db.collection('reports').limit(150).get();
    const reports = await Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data();
      const [reporterDoc, reportedDoc] = await Promise.all([
        data.reporter_id ? db.collection('profiles').doc(data.reporter_id).get() : null,
        data.reported_user_id ? db.collection('profiles').doc(data.reported_user_id).get() : null
      ]);

      return {
        id: doc.id,
        ...data,
        reporter: reporterDoc?.exists ? { id: reporterDoc.id, ...reporterDoc.data() } : null,
        reported_user: reportedDoc?.exists ? { id: reportedDoc.id, ...reportedDoc.data() } : null
      };
    }));

    res.json({
      reports: reports
        .filter(report => !status || status === 'ALL' || report.status === status)
        .sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || '')))
        .slice(0, 100)
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const resolveReport = async (req, res) => {
  const { id } = req.params;
  const { status, note, suspendUser } = req.body;
  try {
    const reportRef = db.collection('reports').doc(id);
    const reportDoc = await reportRef.get();
    if (!reportDoc.exists) return res.status(404).json({ error: 'report_not_found' });

    const report = reportDoc.data();
    await reportRef.update({
      status: status || 'RESOLVED',
      admin_note: note || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: req.user.id
    });

    if (suspendUser && report.reported_user_id) {
      await db.collection('profiles').doc(report.reported_user_id).update({
        suspended_at: new Date().toISOString(),
        suspended_reason: note || report.reason || 'admin_report'
      });
    }

    await appendAdminAuditLog({
      adminId: req.user.id,
      action: 'RESOLVE_REPORT',
      metadata: { reportId: id, status: status || 'RESOLVED', suspendUser: !!suspendUser }
    });

    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const rejectVenue = async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  try {
    await db.collection('venues').doc(id).update({ status: 'REJECTED', rejection_reason: note });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getPrivacyRequests = async (req, res) => {
  try {
    const snapshot = await db.collection('privacy_requests').get();
    res.json({ requests: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getBroadcastAudience = async (req, res) => {
  try {
    const snap = await db.collection('profiles').get();
    res.json({ total: snap.size });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getUsers = async (req, res) => {
  try {
    const { search, gender, is_premium, is_verified, isSuspended } = req.query;
    let query = db.collection('profiles');

    // On récupère tout et on filtre en mémoire pour plus de flexibilité (petite base au début)
    // Pour une grosse base, on utiliserait des index Firestore complexes
    const snapshot = await query.get();
    let users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (search) {
      const s = search.toLowerCase();
      users = users.filter(u =>
        (u.name || '').toLowerCase().includes(s) ||
        (u.email || '').toLowerCase().includes(s) ||
        (u.city || '').toLowerCase().includes(s)
      );
    }

    if (gender && gender !== 'ALL') users = users.filter(u => u.gender === gender);
    if (is_premium === 'true') users = users.filter(u => !!u.is_premium);
    if (is_verified === 'true') users = users.filter(u => !!u.is_verified);
    if (isSuspended === 'true') users = users.filter(u => !!u.suspended_at);

    res.json({ users: users.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)) });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const toggleUserStatus = async (req, res) => {
  const { id } = req.params;
  const { field, value } = req.body; // field: 'is_premium', 'is_verified', 'is_vip', 'suspended_at'
  try {
    const updates = { [field]: value, updated_at: new Date().toISOString() };
    await db.collection('profiles').doc(id).update(updates);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getCampaignHistory = async (req, res) => {
  try {
    const snap = await db.collection('events').where('event_name', '==', 'ADMIN_BROADCAST').limit(50).get();
    res.json({ campaigns: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getPricing = async (req, res) => {
  try {
    const doc = await db.collection('app_settings').doc('pricing').get();
    if (!doc.exists) {
      return res.json({
        PRICES: pricingDefaults.PRICES,
        PLAN_AMOUNTS: pricingDefaults.PLAN_AMOUNTS,
        PARTNER_PLAN_AMOUNTS: pricingDefaults.PARTNER_PLAN_AMOUNTS,
        ROSE_PACKS: pricingDefaults.ROSE_PACKS,
        source: 'defaults'
      });
    }
    const data = doc.data() || {};
    res.json({
      PRICES: { ...pricingDefaults.PRICES, ...(data.PRICES || {}) },
      PLAN_AMOUNTS: { ...pricingDefaults.PLAN_AMOUNTS, ...(data.PLAN_AMOUNTS || {}) },
      PARTNER_PLAN_AMOUNTS: { ...pricingDefaults.PARTNER_PLAN_AMOUNTS, ...(data.PARTNER_PLAN_AMOUNTS || {}) },
      ROSE_PACKS: mergeRosePacks(data.ROSE_PACKS),
      source: 'firestore'
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const updatePricing = async (req, res) => {
  const { PRICES, PLAN_AMOUNTS, PARTNER_PLAN_AMOUNTS, ROSE_PACKS } = req.body;
  try {
    const data = {
      PRICES: PRICES || {},
      PLAN_AMOUNTS: PLAN_AMOUNTS || {},
      PARTNER_PLAN_AMOUNTS: PARTNER_PLAN_AMOUNTS || {},
      ROSE_PACKS: ROSE_PACKS || {},
      updated_at: new Date().toISOString(),
      updated_by: req.user.id
    };
    await db.collection('app_settings').doc('pricing').set(data, { merge: true });

    await appendAdminAuditLog({
      adminId: req.user.id,
      action: 'UPDATE_PRICING',
      metadata: data
    });

    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const reconcileCounters = async (req, res) => {
  try {
    const result = await reconcileAllCounters();

    await appendAdminAuditLog({
      adminId: req.user.id,
      action: 'RECONCILE_COUNTERS',
      metadata: { profilesProcessed: result.processed, profilesUpdated: result.updated }
    });

    res.json({ success: true, processed: result.processed, updated: result.updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const backfillGeohashes = async (req, res) => {
  try {
    const result = await backfillProfileGeohashes();

    await appendAdminAuditLog({
      adminId: req.user.id,
      action: 'BACKFILL_GEOHASHES',
      metadata: { profilesProcessed: result.processed, profilesUpdated: result.updated }
    });

    res.json({ success: true, processed: result.processed, updated: result.updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const seedVenuesFromGoogle = async (req, res) => {
  const { city, categories } = req.body;
  if (!city) return res.status(400).json({ error: 'missing_city' });

  try {
    const requestedCategories = Array.isArray(categories) && categories.length
      ? categories.map((category) => String(category || '').trim().toUpperCase()).filter(Boolean)
      : ['ALL'];
    const normalizedCategories = requestedCategories.includes('ALL') ? ['ALL'] : [...new Set(requestedCategories)];
    const googleTypes = normalizedCategories.includes('ALL')
      ? ADMIN_SEEDER_CATEGORY_TYPES.ALL
      : [...new Set(normalizedCategories.flatMap((category) => ADMIN_SEEDER_CATEGORY_TYPES[category] || []))];

    if (!googleTypes.length) return res.status(400).json({ error: 'invalid_seed_categories' });

    const venues = await searchVenuesInCity(city, googleTypes);
    let createdCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;
    let editorialCount = 0;

    for (const v of venues) {
      // Check for duplicates
      const existing = await db.collection('venues')
        .where('google_place_id', '==', v.google_place_id)
        .limit(1)
        .get();

      if (existing.empty) {
        await db.collection('venues').add(v);
        createdCount++;
        if (v.is_editorial) editorialCount++;
      } else {
        const existingDoc = existing.docs[0];
        const existingData = existingDoc.data();
        const proposedUpdates = {
          rating: v.rating,
          user_ratings_total: v.user_ratings_total,
          google_types: v.google_types,
          google_maps_uri: v.google_maps_uri,
          website_url: v.website_url,
          phone_number: v.phone_number,
          google_photo_name: v.google_photo_name || existingData.google_photo_name || null,
          google_photo_width_px: v.google_photo_width_px || existingData.google_photo_width_px || null,
          google_photo_height_px: v.google_photo_height_px || existingData.google_photo_height_px || null,
          google_photo_attributions: v.google_photo_attributions || existingData.google_photo_attributions || [],
          image_source: v.image_source || existingData.image_source || 'google_places',
          updated_at: new Date().toISOString()
        };
        if (existingData.source === 'GOOGLE_PLACES' && String(existingData.photo_url || '').includes('places.googleapis.com')) {
          proposedUpdates.photo_url = null;
        }
        const updates = Object.entries(proposedUpdates).reduce((acc, [key, value]) => {
          if (key === 'updated_at') return acc;
          if (JSON.stringify(existingData[key] ?? null) !== JSON.stringify(value ?? null)) acc[key] = value;
          return acc;
        }, {});
        if (Object.keys(updates).length) {
          updates.updated_at = proposedUpdates.updated_at;
          await existingDoc.ref.update(updates);
          updatedCount++;
        }
        skippedCount++;
      }
    }

    await appendAdminAuditLog({
      adminId: req.user.id,
      action: 'SEED_VENUES_GOOGLE',
      metadata: {
        city,
        categories: normalizedCategories,
        googleTypes,
        candidateCount: venues.length,
        createdCount,
        updatedCount,
        skippedCount,
        editorialCount
      }
    });

    res.json({
      success: true,
      categories: normalizedCategories,
      googleTypes,
      candidateCount: venues.length,
      createdCount,
      updatedCount,
      skippedCount,
      editorialCount
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

const backfillMediaVariants = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(1000, parseInt(req.body?.limit || req.query?.limit || '250', 10)));
    const images = await backfillImageVariants({ limit });
    const videos = await backfillVideoMedia({ limit: Math.min(limit, 100) });
    const result = { images, videos };

    await appendAdminAuditLog({
      adminId: req.user.id,
      action: 'BACKFILL_MEDIA_VARIANTS',
      metadata: result
    });

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const cleanupMediaOrphans = async (req, res) => {
  try {
    const dryRun = req.body?.dryRun !== false;
    const limit = Math.max(1, Math.min(2000, parseInt(req.body?.limit || req.query?.limit || '500', 10)));
    const result = await cleanupOrphanMedia({ dryRun, limit });

    await appendAdminAuditLog({
      adminId: req.user.id,
      action: dryRun ? 'DRY_RUN_CLEANUP_ORPHAN_MEDIA' : 'CLEANUP_ORPHAN_MEDIA',
      metadata: result
    });

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getStats, getPendingVenues, approveVenue, rejectVenue, reconcileProfiles,
  getPrivacyRequests, resolvePrivacyRequest, getPhotoReviews, reviewPhoto,
  getKycRequests, reviewKyc, getBroadcastAudience, broadcastMessage, getCampaignHistory,
  getReports, resolveReport,
  getUsers, toggleUserStatus, getPricing, updatePricing, reconcileCounters, backfillGeohashes,
  seedVenuesFromGoogle,
  backfillMediaVariants, cleanupMediaOrphans
};
