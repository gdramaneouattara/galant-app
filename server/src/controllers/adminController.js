const { db, admin, auth } = require('../config/firebase');
const { buildUserSegmentFilter, appendAdminAuditLog } = require('../services/accessService');
const { sendPushNotification } = require('../services/notificationService');
const { processUserAction } = require('../services/conciergeService');
const { reconcileAllCounters, backfillProfileGeohashes } = require('../services/maintenanceService');
const { backfillImageVariants, backfillVideoMedia, cleanupOrphanMedia } = require('../services/mediaMaintenanceService');
const { searchVenuesInCity } = require('../services/googleMapsService');
const pricingDefaults = require('../config/constants');

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
      const batch = db.batch();
      recipients.forEach(uid => {
        const ref = db.collection('events').doc();
        batch.set(ref, {
          user_id: uid,
          event_type: 'ADMIN_NOTIFICATION',
          event_name: 'ADMIN_BROADCAST',
          created_at: new Date().toISOString(),
          metadata: { title, message, segment, is_read: false }
        });
        void sendPushNotification(uid, title, message, { type: 'ADMIN_BROADCAST' });
      });
      await batch.commit();
    }

    res.json({ success: true, recipientCount: recipients.length });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getKycRequests = async (req, res) => {
  try {
    const { status } = req.query;
    let query = db.collection('kyc_verifications').orderBy('created_at', 'desc');
    if (status && status !== 'ALL') {
      query = db.collection('kyc_verifications').where('status', '==', status).orderBy('created_at', 'desc');
    }
    const snapshot = await query.get();
    const requests = await Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data();
      const userDoc = await db.collection('profiles').doc(data.user_id).get();
      return { id: doc.id, ...data, user: userDoc.exists ? { id: userDoc.id, ...userDoc.data() } : null };
    }));
    res.json({ requests: requests.filter(r => !!r.user) });
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

      void sendPushNotification(kycData.user_id, 'Profil Certifié ! 💎', 'Votre identité a été vérifiée avec succès.');
    } else if (status === 'REJECTED') {
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
    let query = db.collection('reports').orderBy('created_at', 'desc').limit(100);
    if (status && status !== 'ALL') {
      query = db.collection('reports').where('status', '==', status).orderBy('created_at', 'desc').limit(100);
    }
    const snapshot = await query.get();
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

    res.json({ reports });
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
  const { city } = req.body;
  if (!city) return res.status(400).json({ error: 'missing_city' });

  try {
    const venues = await searchVenuesInCity(city);
    let createdCount = 0;
    let skippedCount = 0;
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
        skippedCount++;
      }
    }

    await appendAdminAuditLog({
      adminId: req.user.id,
      action: 'SEED_VENUES_GOOGLE',
      metadata: { city, candidateCount: venues.length, createdCount, skippedCount, editorialCount }
    });

    res.json({
      success: true,
      candidateCount: venues.length,
      createdCount,
      skippedCount,
      editorialCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
