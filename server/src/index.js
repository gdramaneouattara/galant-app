const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const {
  PORT = 8787,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  EXPO_PUSH_ACCESS_TOKEN = '',
  ALLOWED_ORIGINS = '',
} = process.env;

const app = express();
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const adminRouter = express.Router();

const COMMUNITY_ELIGIBLE_PLANS = ['BIANNUAL', 'ANNUAL'];
const COMMUNITY_ROLES = ['MEMBER', 'MODERATOR', 'ADMIN'];
const INVISIBLE_MODE_PLAN_KEYS = ['BIANNUAL', 'ANNUAL'];
const MAX_TEXT_MESSAGE_LENGTH = 1200;
const MAX_CHAT_MEDIA_BYTES = 10 * 1024 * 1024;
const PREMIUM_PLAN_DURATIONS_DAYS = {
  MONTHLY: 30,
  QUARTERLY: 90,
  BIANNUAL: 180,
  ANNUAL: 365,
};
const BOOST_PLAN_DURATIONS_MS = {
  DAILY: 24 * 60 * 60 * 1000,
  THREE_DAYS: 3 * 24 * 60 * 60 * 1000,
  SEVEN_DAYS: 7 * 24 * 60 * 60 * 1000,
};

const allowedOrigins = ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean);

app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('cors_origin_not_allowed'));
  },
}));

app.use((err, req, res, next) => {
  if (err?.message === 'cors_origin_not_allowed') {
    return res.status(403).json({ error: 'cors_origin_not_allowed' });
  }
  return next(err);
});

app.use(express.json({ limit: '1mb' }));

const sendPushToUser = async ({ userId, title, body, data }) => {
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (!tokens || tokens.length === 0) return;

  const messages = tokens.map((tokenRow) => ({
    to: tokenRow.token,
    sound: 'default',
    title,
    body,
    data: data || {},
  }));

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${EXPO_PUSH_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(messages),
    });
  } catch (pushError) {
    console.error('Push error', pushError);
  }
};

const detectTextModerationViolation = (content) => {
  const normalized = String(content || '').trim().toLowerCase();
  if (!normalized) return 'empty_message';
  if (normalized.length > MAX_TEXT_MESSAGE_LENGTH) return 'message_too_long';
  if (/(escort|hate speech|kill yourself)/i.test(normalized)) return 'content_inappropriate';
  return null;
};

const detectImageModerationViolation = ({ mediaPath, mediaMimeType, mediaSizeBytes }) => {
  if (!mediaPath) return 'missing_media';
  if (Number(mediaSizeBytes || 0) > MAX_CHAT_MEDIA_BYTES) return 'media_too_large';
  if (mediaMimeType && !String(mediaMimeType).startsWith('image/')) return 'unsupported_media_type';
  return null;
};

const detectVideoModerationViolation = ({ mediaPath, mediaMimeType, mediaSizeBytes }) => {
  if (!mediaPath) return 'missing_media';
  if (Number(mediaSizeBytes || 0) > MAX_CHAT_MEDIA_BYTES) return 'media_too_large';
  if (mediaMimeType && !String(mediaMimeType).startsWith('video/')) return 'unsupported_media_type';
  return null;
};

const normalizeKycDocumentType = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'NATIONAL_ID' || normalized === 'ID_CARD') return 'ID_CARD';
  if (normalized === 'DRIVER_LICENSE' || normalized === 'DRIVERS_LICENSE') return 'DRIVERS_LICENSE';
  if (normalized === 'PASSPORT') return 'PASSPORT';
  return null;
};

const normalizePrivacyRequestType = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'EXPORT' || normalized === 'DATA_EXPORT') return 'DATA_EXPORT';
  if (normalized === 'DELETE' || normalized === 'ACCOUNT_DELETION') return 'ACCOUNT_DELETION';
  return null;
};

const mapPrivacyRequestTypeForClient = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'DATA_EXPORT') return 'EXPORT';
  if (normalized === 'ACCOUNT_DELETION') return 'DELETE';
  return normalized || 'EXPORT';
};

const normalizePrivacyStatusForDb = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'OPEN' || normalized === 'PENDING') return 'PENDING';
  if (normalized === 'IN_PROGRESS' || normalized === 'PROCESSING') return 'PROCESSING';
  if (normalized === 'RESOLVED' || normalized === 'COMPLETED') return 'COMPLETED';
  if (normalized === 'REJECTED' || normalized === 'FAILED') return 'FAILED';
  return null;
};

const mapPrivacyStatusForClient = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'PENDING') return 'OPEN';
  if (normalized === 'PROCESSING') return 'IN_PROGRESS';
  if (normalized === 'COMPLETED') return 'RESOLVED';
  if (normalized === 'FAILED') return 'REJECTED';
  return normalized || 'OPEN';
};

const normalizeReportStatusForDb = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'OPEN' || normalized === 'PENDING') return 'PENDING';
  if (normalized === 'IN_REVIEW' || normalized === 'INVESTIGATING') return 'INVESTIGATING';
  if (normalized === 'RESOLVED') return 'RESOLVED';
  if (normalized === 'DISMISSED' || normalized === 'REJECTED') return 'DISMISSED';
  return null;
};

const mapReportStatusForClient = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'PENDING') return 'OPEN';
  if (normalized === 'INVESTIGATING') return 'IN_REVIEW';
  if (normalized === 'RESOLVED') return 'RESOLVED';
  if (normalized === 'DISMISSED') return 'DISMISSED';
  return normalized || 'OPEN';
};

const extractBucketPathFromUrl = (url, bucketId) => {
  const input = String(url || '').trim();
  if (!input) return null;
  if (!/^https?:\/\//i.test(input)) return input;

  const marker = `/storage/v1/object/public/${bucketId}/`;
  const markerIndex = input.indexOf(marker);
  if (markerIndex === -1) return null;
  return decodeURIComponent(input.slice(markerIndex + marker.length));
};

const createSignedStorageUrl = async (bucketId, path) => {
  if (!path) return null;
  const normalizedPath = String(path).trim();
  if (!normalizedPath) return null;
  if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;

  const { data, error } = await supabase.storage.from(bucketId).createSignedUrl(normalizedPath, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
};

const generateCheckoutReference = (prefix) => {
  const randomPart = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}_${Date.now()}_${randomPart}`;
};

const buildAuthorizationUrl = (kind, reference) => {
  const baseUrl = process.env.PAYMENT_CHECKOUT_URL || 'https://checkout.yamo.app';
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}kind=${encodeURIComponent(kind)}&reference=${encodeURIComponent(reference)}`;
};

const findEventByName = async (eventType, eventName, userId) => {
  const { data, error } = await supabase
    .from('events')
    .select('id, user_id, event_type, event_name, payload, metadata, created_at')
    .eq('event_type', eventType)
    .eq('event_name', eventName)
    .eq('user_id', userId)
    .maybeSingle();

  return { data, error };
};

const getActiveSubscriptionPlan = async (userId) => {
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('id, plan_id, status, current_period_end')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('current_period_end', { ascending: false });

  if (error || !subscriptions || subscriptions.length === 0) return null;

  const nowTs = Date.now();
  const expiredIds = [];
  let activeSubscription = null;

  for (const subscription of subscriptions) {
    const endTs = subscription.current_period_end
      ? new Date(subscription.current_period_end).getTime()
      : null;
    const isExpired = endTs !== null && endTs <= nowTs;

    if (isExpired) {
      expiredIds.push(subscription.id);
      continue;
    }

    if (!activeSubscription) {
      activeSubscription = subscription;
    }
  }

  if (expiredIds.length > 0) {
    await supabase
      .from('subscriptions')
      .update({ status: 'expired', cancel_at_period_end: true })
      .in('id', expiredIds);
  }

  return activeSubscription;
};

const getInvisibleModeEligibleUserIds = async (userIds) => {
  const uniqueUserIds = [...new Set((userIds || []).filter(Boolean))];
  if (uniqueUserIds.length === 0) return new Set();

  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('user_id, plan_id, status, current_period_end')
    .in('user_id', uniqueUserIds)
    .eq('status', 'active');

  if (error || !subscriptions) return new Set();

  const nowTs = Date.now();
  return new Set(
    subscriptions
      .filter((subscription) => {
        const planKey = String(subscription.plan_id || '').toUpperCase();
        if (!INVISIBLE_MODE_PLAN_KEYS.includes(planKey)) return false;
        if (!subscription.current_period_end) return true;
        return new Date(subscription.current_period_end).getTime() > nowTs;
      })
      .map((subscription) => subscription.user_id)
  );
};

const hasInvisibleModeAccess = async (userId) => {
  const eligibleUserIds = await getInvisibleModeEligibleUserIds([userId]);
  return eligibleUserIds.has(userId);
};

const shouldHideProfileFromMatchmaking = (profile, eligibleInvisibleUserIds) => (
  !!profile?.is_invisible && eligibleInvisibleUserIds.has(profile.id)
);

const isValidTimeZone = (timeZone) => {
  if (!timeZone) return false;

  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

const resolveRequestTimeZone = (req) => {
  const requestedTimeZone = String(req.headers['x-timezone'] || '').trim();
  return isValidTimeZone(requestedTimeZone) ? requestedTimeZone : 'UTC';
};

const getTimeZoneDateTimeParts = (date, timeZone) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  const normalizedHour = Number(parts.hour) === 24 ? 0 : Number(parts.hour);
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: normalizedHour,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
};

const getTimeZoneOffsetMs = (date, timeZone) => {
  const parts = getTimeZoneDateTimeParts(date, timeZone);
  const asUtcTimestamp = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtcTimestamp - date.getTime();
};

const zonedDateTimeToUtc = ({ year, month, day, hour = 0, minute = 0, second = 0 }, timeZone) => {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offsetMs = getTimeZoneOffsetMs(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offsetMs);
};

const getLikeQuotaWindow = (timeZone, now = new Date()) => {
  const localNowParts = getTimeZoneDateTimeParts(now, timeZone);
  const startAt = zonedDateTimeToUtc({
    year: localNowParts.year,
    month: localNowParts.month,
    day: localNowParts.day,
    hour: 0,
    minute: 0,
    second: 0,
  }, timeZone);
  const resetAt = zonedDateTimeToUtc({
    year: localNowParts.year,
    month: localNowParts.month,
    day: localNowParts.day + 1,
    hour: 0,
    minute: 0,
    second: 0,
  }, timeZone);

  return { startAt, resetAt };
};

const getExcludedMatchmakingUserIds = async (userId) => {
  const [
    likesSentResponse,
    passesSentResponse,
    matchesResponse,
    blocksResponse,
  ] = await Promise.all([
    supabase.from('likes').select('liked_id').eq('liker_id', userId),
    supabase.from('passes').select('passed_user_id').eq('passer_id', userId),
    supabase.from('matches').select('user_one_id, user_two_id').or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`),
    supabase.from('blocks').select('user_id, blocked_user_id').or(`user_id.eq.${userId},blocked_user_id.eq.${userId}`),
  ]);

  const responses = [
    likesSentResponse,
    passesSentResponse,
    matchesResponse,
    blocksResponse,
  ];
  const failedResponse = responses.find((response) => response.error);
  if (failedResponse?.error) {
    return { error: failedResponse.error, excludedUserIds: new Set() };
  }

  const excludedUserIds = new Set();

  for (const row of likesSentResponse.data || []) {
    if (row.liked_id) excludedUserIds.add(row.liked_id);
  }

  for (const row of passesSentResponse.data || []) {
    if (row.passed_user_id) excludedUserIds.add(row.passed_user_id);
  }

  for (const match of matchesResponse.data || []) {
    const otherUserId = match.user_one_id === userId ? match.user_two_id : match.user_one_id;
    if (otherUserId) excludedUserIds.add(otherUserId);
  }

  for (const block of blocksResponse.data || []) {
    const otherUserId = block.user_id === userId ? block.blocked_user_id : block.user_id;
    if (otherUserId) excludedUserIds.add(otherUserId);
  }

  return { error: null, excludedUserIds };
};

const getLikeQuota = async (userId, isPremium, timeZone = 'UTC') => {
  if (isPremium) {
    return { limit: null, used: 0, remaining: 999, resetAt: null };
  }

  const { startAt, resetAt } = getLikeQuotaWindow(timeZone);

  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('liker_id', userId)
    .gte('created_at', startAt.toISOString())
    .lt('created_at', resetAt.toISOString());

  const limit = 10;
  return {
    limit,
    used: count || 0,
    remaining: Math.max(0, limit - (count || 0)),
    resetAt: resetAt.toISOString(),
  };
};

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const extractCoordinates = (profile) => {
  if (!profile) return null;

  const directLat = toFiniteNumber(profile.latitude ?? profile.lat);
  const directLng = toFiniteNumber(profile.longitude ?? profile.lng);
  if (directLat !== null && directLng !== null) return { lat: directLat, lng: directLng };

  const location = profile.location;
  if (!location) return null;

  if (typeof location === 'object' && Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
    const lng = toFiniteNumber(location.coordinates[0]);
    const lat = toFiniteNumber(location.coordinates[1]);
    if (lat !== null && lng !== null) return { lat, lng };
  }

  if (typeof location === 'string') {
    let raw = location.trim();
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.coordinates) && parsed.coordinates.length >= 2) {
          const lng = toFiniteNumber(parsed.coordinates[0]);
          const lat = toFiniteNumber(parsed.coordinates[1]);
          if (lat !== null && lng !== null) return { lat, lng };
        }
      } catch (_error) {
        // Keep trying with other formats.
      }
    }

    const match = raw.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (match) {
      const lng = toFiniteNumber(match[1]);
      const lat = toFiniteNumber(match[2]);
      if (lat !== null && lng !== null) return { lat, lng };
    }
  }

  return null;
};

const haversineDistanceKm = (a, b) => {
  if (!a || !b) return null;

  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const distance = 2 * earthRadiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Number.isFinite(distance) ? distance : null;
};

const logAdminAction = async ({
  adminId,
  action,
  targetId,
  targetType,
  oldData,
  newData,
}) => {
  await supabase.from('admin_audit_logs').insert({
    admin_id: adminId,
    action,
    target_id: targetId,
    target_type: targetType,
    old_data: oldData || {},
    new_data: newData || {},
  });
};

const listAllAuthUsers = async () => {
  const users = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) return { users: null, error };

    const pageUsers = data?.users || [];
    users.push(...pageUsers);
    if (pageUsers.length < perPage) break;
    page += 1;
  }

  return { users, error: null };
};

const normalizeAdminMessageSegment = (value) => {
  const normalized = String(value || 'ALL').trim().toUpperCase();
  const allowedSegments = new Set([
    'ALL',
    'ACTIVE',
    'UNVERIFIED',
    'VERIFIED',
    'FREE',
    'PREMIUM',
    'INVISIBLE_PREMIUM',
    'SUSPENDED',
  ]);
  return allowedSegments.has(normalized) ? normalized : null;
};

const filterProfilesBySegment = (profiles, segment) => {
  const normalizedSegment = normalizeAdminMessageSegment(segment) || 'ALL';
  return (profiles || []).filter((profile) => {
    if (profile?.is_admin) return false;

    switch (normalizedSegment) {
      case 'ACTIVE':
        return !profile?.suspended_at;
      case 'UNVERIFIED':
        return !profile?.suspended_at && !profile?.is_verified;
      case 'VERIFIED':
        return !profile?.suspended_at && !!profile?.is_verified;
      case 'FREE':
        return !profile?.suspended_at && !profile?.is_premium;
      case 'PREMIUM':
        return !profile?.suspended_at && !!profile?.is_premium;
      case 'INVISIBLE_PREMIUM':
        return !profile?.suspended_at && !!profile?.is_premium && !!profile?.is_invisible;
      case 'SUSPENDED':
        return !!profile?.suspended_at;
      case 'ALL':
      default:
        return true;
    }
  });
};

const getAdminAudienceProfiles = async (segment) => {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, name, is_admin, is_verified, is_premium, is_invisible, suspended_at');

  if (error) return { profiles: null, error };
  return {
    profiles: filterProfilesBySegment(profiles || [], segment),
    error: null,
  };
};

const buildAdminNotificationMetadata = ({
  campaignId,
  title,
  message,
  segment,
  sentAt,
  isRead = false,
  readAt = null,
}) => ({
  title: title || null,
  message,
  segment,
  sent_at: sentAt,
  is_read: isRead,
  read_at: readAt,
  campaign_id: campaignId,
});

const buildReconciledProfilePayload = (authUser) => {
  const metadata = authUser?.user_metadata || {};
  const normalizedGender = String(metadata.gender || '').trim().toUpperCase();
  const gender = ['MALE', 'FEMALE', 'OTHER'].includes(normalizedGender) ? normalizedGender : 'OTHER';
  const latitude = toFiniteNumber(metadata.latitude ?? metadata.lat);
  const longitude = toFiniteNumber(metadata.longitude ?? metadata.lng);
  const rawPhotos = Array.isArray(metadata.photos)
    ? metadata.photos.map((photo) => String(photo || '').trim()).filter(Boolean)
    : [];

  if (latitude === null || longitude === null) return null;
  if (rawPhotos.length < 3 || rawPhotos.length > 6) return null;

  const age = Math.max(18, toFiniteNumber(metadata.age) || 18);
  const fallbackName = authUser?.email?.split('@')[0]
    || authUser?.phone
    || `Utilisateur ${String(authUser?.id || '').slice(0, 8)}`;

  return {
    id: authUser.id,
    name: String(metadata.name || fallbackName).trim(),
    age,
    gender,
    bio: String(metadata.bio || '').trim() || null,
    photos: rawPhotos,
    location: `POINT(${longitude} ${latitude})`,
    relationship_goal: String(metadata.relationship_goal || '').trim() || null,
    city: String(metadata.city || '').trim() || null,
    country: String(metadata.country || '').trim() || null,
    phone: authUser?.phone || String(metadata.phone || '').trim() || null,
    photo_review_status: 'PENDING',
    onboarding_completed: true,
  };
};

const normalizeCommunityRole = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  return COMMUNITY_ROLES.includes(normalized) ? normalized : null;
};

const getCommunityMembership = async (communityId, userId) => {
  const { data, error } = await supabase
    .from('community_members')
    .select('community_id, user_id, role, joined_at')
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .maybeSingle();

  return {
    membership: data || null,
    error,
  };
};

const getCommunityAdminCount = async (communityId) => {
  const { count, error } = await supabase
    .from('community_members')
    .select('*', { count: 'exact', head: true })
    .eq('community_id', communityId)
    .eq('role', 'ADMIN');

  return {
    count: count || 0,
    error,
  };
};

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'missing_token' });

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: 'invalid_token' });

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, suspended_at, is_premium, is_verified, onboarding_completed')
      .eq('id', data.user.id)
      .single();

    if (profileError && profileError.code === 'PGRST116') {
      return res.status(403).json({ error: 'profile_not_found' });
    }

    if (profileError) throw profileError;
    if (profile?.suspended_at) return res.status(403).json({ error: 'suspended_account' });

    const subscription = await getActiveSubscriptionPlan(data.user.id);
    const effectivePremium = !!subscription;

    if (profile?.is_premium !== effectivePremium) {
      const profilePatch = { is_premium: effectivePremium };
      if (!effectivePremium) {
        profilePatch.is_invisible = false;
      }
      const { error: profileSyncError } = await supabase
        .from('profiles')
        .update(profilePatch)
        .eq('id', data.user.id);
      if (!profileSyncError) {
        profile.is_premium = effectivePremium;
      }
    }

    req.user = {
      id: data.user.id,
      isAdmin: !!profile?.is_admin,
      isPremium: effectivePremium,
      isVerified: !!profile?.is_verified,
      onboardingCompleted: !!profile?.onboarding_completed,
    };
    req.authUser = data.user;
    return next();
  } catch (authError) {
    console.error('Auth error', authError);
    return res.status(500).json({ error: 'auth_check_failed' });
  }
};

const requireAdmin = async (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'admin_required' });
  }
  return next();
};

app.post('/api/payments/initialize', requireAuth, async (req, res) => {
  const normalizedPlanId = String(req.body?.planId || '').trim().toUpperCase();
  const planDurationDays = PREMIUM_PLAN_DURATIONS_DAYS[normalizedPlanId];
  if (!planDurationDays) return res.status(400).json({ error: 'invalid_plan_id' });

  const reference = generateCheckoutReference('PAY');
  const eventName = `payment_init:${reference}`;
  const authorization_url = buildAuthorizationUrl('premium', reference);
  const initializedAt = new Date().toISOString();

  const { error } = await supabase.from('events').insert({
    user_id: req.user.id,
    event_type: 'PAYMENT',
    event_name: eventName,
    payload: {
      reference,
      planId: normalizedPlanId,
      planDurationDays,
      status: 'PENDING',
      initializedAt,
    },
    metadata: {
      provider: 'INTERNAL',
      flow: 'premium_subscription',
    },
  });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ authorization_url, reference });
});

app.get('/api/payments/verify', requireAuth, async (req, res) => {
  const reference = String(req.query?.reference || '').trim();
  if (!reference) return res.status(400).json({ error: 'missing_reference' });

  const verifyEventName = `payment_verified:${reference}`;
  const { data: existingVerify, error: existingVerifyError } = await findEventByName('PAYMENT', verifyEventName, req.user.id);
  if (existingVerifyError) return res.status(500).json({ error: existingVerifyError.message });
  if (existingVerify) {
    return res.json({
      status: 'active',
      reference,
      plan_id: existingVerify.payload?.planId || null,
      current_period_end: existingVerify.payload?.currentPeriodEnd || null,
    });
  }

  const initEventName = `payment_init:${reference}`;
  const { data: initialized, error: initError } = await findEventByName('PAYMENT', initEventName, req.user.id);
  if (initError) return res.status(500).json({ error: initError.message });
  if (!initialized) return res.status(404).json({ error: 'payment_reference_not_found' });

  const normalizedPlanId = String(initialized.payload?.planId || '').toUpperCase();
  const planDurationDays = PREMIUM_PLAN_DURATIONS_DAYS[normalizedPlanId];
  if (!planDurationDays) return res.status(400).json({ error: 'invalid_plan_id' });

  const now = new Date();
  const current_period_start = now.toISOString();
  const currentPeriodEndDate = new Date(now.getTime() + planDurationDays * 24 * 60 * 60 * 1000);
  const current_period_end = currentPeriodEndDate.toISOString();

  const { error: closeSubscriptionsError } = await supabase
    .from('subscriptions')
    .update({
      status: 'expired',
      current_period_end: current_period_start,
      cancel_at_period_end: true,
    })
    .eq('user_id', req.user.id)
    .eq('status', 'active');

  if (closeSubscriptionsError) return res.status(500).json({ error: closeSubscriptionsError.message });

  const { error: createSubscriptionError } = await supabase
    .from('subscriptions')
    .insert({
      user_id: req.user.id,
      plan_id: normalizedPlanId,
      status: 'active',
      current_period_start,
      current_period_end,
      cancel_at_period_end: false,
    });

  if (createSubscriptionError) return res.status(500).json({ error: createSubscriptionError.message });

  const profileUpdatePayload = { is_premium: true };
  if (!INVISIBLE_MODE_PLAN_KEYS.includes(normalizedPlanId)) {
    profileUpdatePayload.is_invisible = false;
  }

  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update(profileUpdatePayload)
    .eq('id', req.user.id);

  if (profileUpdateError) return res.status(500).json({ error: profileUpdateError.message });

  const { error: verifyEventError } = await supabase.from('events').insert({
    user_id: req.user.id,
    event_type: 'PAYMENT',
    event_name: verifyEventName,
    payload: {
      reference,
      planId: normalizedPlanId,
      status: 'active',
      currentPeriodEnd: current_period_end,
    },
    metadata: {
      provider: 'INTERNAL',
      flow: 'premium_subscription',
    },
  });

  if (verifyEventError) return res.status(500).json({ error: verifyEventError.message });
  return res.json({ status: 'active', reference, plan_id: normalizedPlanId, current_period_end });
});

app.post('/api/boosts/initialize', requireAuth, async (req, res) => {
  const normalizedBoostId = String(req.body?.boostId || '').trim().toUpperCase();
  const boostDurationMs = BOOST_PLAN_DURATIONS_MS[normalizedBoostId];
  if (!boostDurationMs) return res.status(400).json({ error: 'invalid_boost_id' });

  const reference = generateCheckoutReference('BOOST');
  const eventName = `boost_init:${reference}`;
  const authorization_url = buildAuthorizationUrl('boost', reference);
  const initializedAt = new Date().toISOString();

  const { error } = await supabase.from('events').insert({
    user_id: req.user.id,
    event_type: 'BOOST',
    event_name: eventName,
    payload: {
      reference,
      boostId: normalizedBoostId,
      boostDurationMs,
      status: 'PENDING',
      initializedAt,
    },
    metadata: {
      provider: 'INTERNAL',
      flow: 'profile_boost',
    },
  });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ authorization_url, reference });
});

app.get('/api/boosts/verify', requireAuth, async (req, res) => {
  const reference = String(req.query?.reference || '').trim();
  if (!reference) return res.status(400).json({ error: 'missing_reference' });

  const verifyEventName = `boost_verified:${reference}`;
  const { data: existingVerify, error: existingVerifyError } = await findEventByName('BOOST', verifyEventName, req.user.id);
  if (existingVerifyError) return res.status(500).json({ error: existingVerifyError.message });
  if (existingVerify) {
    return res.json({
      status: 'active',
      reference,
      boosted_until: existingVerify.payload?.boostedUntil || null,
    });
  }

  const initEventName = `boost_init:${reference}`;
  const { data: initialized, error: initError } = await findEventByName('BOOST', initEventName, req.user.id);
  if (initError) return res.status(500).json({ error: initError.message });
  if (!initialized) return res.status(404).json({ error: 'boost_reference_not_found' });

  const normalizedBoostId = String(initialized.payload?.boostId || '').toUpperCase();
  const boostDurationMs = BOOST_PLAN_DURATIONS_MS[normalizedBoostId];
  if (!boostDurationMs) return res.status(400).json({ error: 'invalid_boost_id' });

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('boosted_until')
    .eq('id', req.user.id)
    .single();

  if (profileError) return res.status(500).json({ error: profileError.message });

  const now = Date.now();
  const activeBoostUntilTs = profile?.boosted_until ? new Date(profile.boosted_until).getTime() : 0;
  const boostBaseTs = Number.isFinite(activeBoostUntilTs) && activeBoostUntilTs > now ? activeBoostUntilTs : now;
  const boostedUntilDate = new Date(boostBaseTs + boostDurationMs);
  const boosted_until = boostedUntilDate.toISOString();

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ boosted_until })
    .eq('id', req.user.id);

  if (updateError) return res.status(500).json({ error: updateError.message });

  const { error: verifyEventError } = await supabase.from('events').insert({
    user_id: req.user.id,
    event_type: 'BOOST',
    event_name: verifyEventName,
    payload: {
      reference,
      boostId: normalizedBoostId,
      status: 'active',
      boostedUntil: boosted_until,
    },
    metadata: {
      provider: 'INTERNAL',
      flow: 'profile_boost',
    },
  });

  if (verifyEventError) return res.status(500).json({ error: verifyEventError.message });
  return res.json({ status: 'active', reference, boosted_until });
});

app.get('/api/likes/quota', requireAuth, async (req, res) => {
  const requestTimeZone = resolveRequestTimeZone(req);
  const quota = await getLikeQuota(req.user.id, req.user.isPremium, requestTimeZone);
  return res.json({
    isPremium: !!req.user.isPremium,
    timeZone: requestTimeZone,
    limit: quota.limit,
    used: quota.used,
    remaining: quota.remaining,
    resetAt: quota.resetAt,
  });
});

app.get('/api/premium/likes-received', requireAuth, async (req, res) => {
  if (!req.user.isPremium) return res.status(403).json({ error: 'premium_required' });

  const { data: likesRows, error: likesError } = await supabase
    .from('likes')
    .select('liker_id, is_super_like, created_at')
    .eq('liked_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(200);

  if (likesError) return res.status(500).json({ error: likesError.message });

  const likerIds = [...new Set((likesRows || []).map((row) => row.liker_id).filter(Boolean))];
  if (likerIds.length === 0) return res.json({ likes: [] });

  const { data: likerProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, age, gender, city, photos, interests, is_verified, is_premium, suspended_at, is_admin, onboarding_completed')
    .in('id', likerIds);

  if (profilesError) return res.status(500).json({ error: profilesError.message });

  const profileById = new Map(
    (likerProfiles || [])
      .filter((profile) => !profile.suspended_at && !profile.is_admin && profile.onboarding_completed)
      .map((profile) => [profile.id, profile])
  );

  const likes = (likesRows || []).reduce((acc, row) => {
    const user = profileById.get(row.liker_id);
    if (!user) return acc;
    acc.push({
      liker_id: row.liker_id,
      is_super_like: !!row.is_super_like,
      created_at: row.created_at,
      user: {
        id: user.id,
        name: user.name,
        age: user.age,
        gender: user.gender,
        city: user.city || null,
        photos: user.photos || [],
        interests: user.interests || [],
        is_verified: !!user.is_verified,
        is_premium: !!user.is_premium,
      },
    });
    return acc;
  }, []);

  return res.json({ likes });
});

app.get('/api/matchmaking/suggestions', requireAuth, async (req, res) => {
  if (!req.user.onboardingCompleted) {
    return res.status(403).json({ error: 'profile_incomplete' });
  }

  const {
    min_age,
    max_age,
    city,
    interests,
    distance_km,
    status,
    country,
    city_mode,
    limit,
  } = req.query;

  const parsedDistanceKm = toFiniteNumber(distance_km);
  const parsedLimit = Math.max(1, Math.min(100, toFiniteNumber(limit) || 40));
  const normalizedStatus = String(status || 'ALL').toUpperCase();
  const normalizedCity = String(city || '').trim();
  const normalizedCountry = String(country || '').trim();
  const normalizedCityMode = String(city_mode || 'contains').toLowerCase() === 'exact' ? 'exact' : 'contains';

  const { data: me } = await supabase.from('profiles').select('*').eq('id', req.user.id).single();

  let query = supabase
    .from('profiles')
    .select('*')
    .neq('id', req.user.id)
    .eq('is_admin', false)
    .eq('onboarding_completed', true)
    .eq('photo_review_status', 'APPROVED')
    .is('suspended_at', null);

  if (min_age) query = query.gte('age', min_age);
  if (max_age) query = query.lte('age', max_age);
  if (normalizedCity) {
    if (normalizedCityMode === 'exact') {
      query = query.eq('city', normalizedCity);
    } else {
      query = query.ilike('city', `%${normalizedCity}%`);
    }
  }
  if (normalizedCountry) query = query.ilike('country', `%${normalizedCountry}%`);

  if (normalizedStatus === 'VERIFIED') query = query.eq('is_verified', true);
  if (normalizedStatus === 'UNVERIFIED') query = query.eq('is_verified', false);
  if (normalizedStatus === 'PREMIUM') query = query.eq('is_premium', true);
  if (normalizedStatus === 'FREE') query = query.eq('is_premium', false);

  const { data: candidates } = await query;
  const [
    likesReceivedResponse,
    likesSentResponse,
    excludedUsersResponse,
  ] = await Promise.all([
    supabase
      .from('likes')
      .select('liker_id, is_super_like')
      .eq('liked_id', req.user.id),
    supabase
      .from('likes')
      .select('liked_id')
      .eq('liker_id', req.user.id),
    getExcludedMatchmakingUserIds(req.user.id),
  ]);

  if (likesReceivedResponse.error) return res.status(500).json({ error: likesReceivedResponse.error.message });
  if (likesSentResponse.error) return res.status(500).json({ error: likesSentResponse.error.message });
  if (excludedUsersResponse.error) return res.status(500).json({ error: excludedUsersResponse.error.message });

  const likesReceived = likesReceivedResponse.data || [];
  const likesSent = likesSentResponse.data || [];
  const excludedUserIds = excludedUsersResponse.excludedUserIds;

  const likedMe = new Set(likesReceived.map((like) => like.liker_id));
  const likedByMe = new Set(likesSent.map((like) => like.liked_id));
  const superLikedMe = new Set(likesReceived.filter((like) => like.is_super_like).map((like) => like.liker_id));
  const invisibleEligibleUserIds = await getInvisibleModeEligibleUserIds((candidates || []).map((candidate) => candidate.id));

  const now = Date.now();
  const meCoordinates = extractCoordinates(me);

  let suggestions = (candidates || []).map((candidate) => {
    if (excludedUserIds.has(candidate.id)) {
      return null;
    }

    if (shouldHideProfileFromMatchmaking(candidate, invisibleEligibleUserIds)) {
      return null;
    }

    const candidateCoordinates = extractCoordinates(candidate);
    const computedDistanceKm = meCoordinates
      ? haversineDistanceKm(meCoordinates, candidateCoordinates)
      : null;

    if (
      parsedDistanceKm !== null
      && parsedDistanceKm > 0
      && meCoordinates
      && (computedDistanceKm === null || computedDistanceKm > parsedDistanceKm)
    ) {
      return null;
    }

    let score = 0;
    if (candidate.relationship_goal === me?.relationship_goal) score += 30;
    if (candidate.city === me?.city) score += 15;
    if (candidate.is_premium) score += 12;
    if (candidate.boosted_until && new Date(candidate.boosted_until) > now) score += 50;
    if (superLikedMe.has(candidate.id)) score += 100;
    return {
      ...candidate,
      score,
      super_liked_me: superLikedMe.has(candidate.id),
      liked_me: likedMe.has(candidate.id),
      liked_by_me: likedByMe.has(candidate.id),
      distance_km: computedDistanceKm,
    };
  }).filter(Boolean);

  if (interests) {
    const filterList = String(interests).split(',').map((interest) => interest.trim().toLowerCase());
    suggestions = suggestions.filter((suggestion) =>
      suggestion.interests?.some((interest) => filterList.includes(String(interest).toLowerCase()))
    );
  }

  suggestions = suggestions.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (left.distance_km === null && right.distance_km === null) return 0;
    if (left.distance_km === null) return 1;
    if (right.distance_km === null) return -1;
    return left.distance_km - right.distance_km;
  });

  return res.json({ suggestions: suggestions.slice(0, parsedLimit) });
});

app.post('/api/matchmaking/view-profile', requireAuth, async (req, res) => {
  const { targetUserId } = req.body;
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', targetUserId)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!profile || !profile.onboarding_completed || profile.suspended_at || profile.photo_review_status !== 'APPROVED') {
    return res.status(404).json({ error: 'profile_not_found' });
  }

  const invisibleModeAllowed = await hasInvisibleModeAccess(profile.id);
  const visibleProfile = {
    ...profile,
    ...(invisibleModeAllowed ? {} : { is_invisible: false }),
  };

  await supabase.from('events').insert({
    user_id: req.user.id,
    event_type: 'MATCHMAKING',
    event_name: 'view_profile',
    payload: { targetUserId },
  });

  return res.json({ profile: visibleProfile });
});

app.post('/api/matchmaking/swipe', requireAuth, async (req, res) => {
  const { targetUserId, direction, isSuperLike } = req.body;
  const normalizedDirection = String(direction || '').toUpperCase();

  if (normalizedDirection !== 'LEFT' && normalizedDirection !== 'RIGHT') {
    return res.status(400).json({ error: 'invalid_swipe_direction' });
  }

  if (normalizedDirection === 'RIGHT' && isSuperLike && !req.user.isPremium) {
    return res.status(403).json({ error: 'premium_required_for_super_like' });
  }

  if (!targetUserId || targetUserId === req.user.id) {
    return res.status(400).json({ error: 'invalid_swipe_target' });
  }

  const { data: targetProfile, error: targetProfileError } = await supabase
    .from('profiles')
    .select('id, name, suspended_at, is_admin, photo_review_status, onboarding_completed')
    .eq('id', targetUserId)
    .maybeSingle();

  if (targetProfileError) return res.status(500).json({ error: targetProfileError.message });
  if (!targetProfile || !targetProfile.onboarding_completed || targetProfile.suspended_at || targetProfile.is_admin || targetProfile.photo_review_status !== 'APPROVED') {
    return res.status(404).json({ error: 'profile_not_found' });
  }

  if (normalizedDirection === 'LEFT') {
    const { error: removeLikeError } = await supabase
      .from('likes')
      .delete()
      .eq('liker_id', req.user.id)
      .eq('liked_id', targetUserId);

    if (removeLikeError) return res.status(500).json({ error: removeLikeError.message });

    const { error: passError } = await supabase.from('passes').upsert({
      passer_id: req.user.id,
      passed_user_id: targetUserId,
      created_at: new Date().toISOString(),
    }, {
      onConflict: 'passer_id,passed_user_id',
    });

    if (passError) return res.status(500).json({ error: passError.message });

    await supabase.from('events').insert({
      user_id: req.user.id,
      event_type: 'MATCHMAKING',
      event_name: 'pass_sent',
      payload: {
        targetUserId,
        direction: normalizedDirection,
      },
    });

    return res.json({
      passed: true,
      liked: false,
      superLiked: false,
      matched: false,
    });
  }

  const requestTimeZone = resolveRequestTimeZone(req);
  const quota = await getLikeQuota(req.user.id, req.user.isPremium, requestTimeZone);
  if (quota.remaining <= 0 && !req.user.isPremium) {
    return res.status(403).json({ error: 'daily_like_limit_reached', likeQuota: quota });
  }

  const { error: clearPassError } = await supabase
    .from('passes')
    .delete()
    .eq('passer_id', req.user.id)
    .eq('passed_user_id', targetUserId);

  if (clearPassError) return res.status(500).json({ error: clearPassError.message });

  await supabase.from('likes').upsert({
    liker_id: req.user.id,
    liked_id: targetUserId,
    is_super_like: !!isSuperLike,
  });

  await supabase.from('events').insert({
    user_id: req.user.id,
    event_type: 'MATCHMAKING',
    event_name: isSuperLike ? 'super_like_sent' : 'like_sent',
    payload: {
      targetUserId,
      direction: normalizedDirection,
      isSuperLike: !!isSuperLike,
    },
  });

  const { data: reciprocalLike } = await supabase.from('likes')
    .select('*')
    .eq('liker_id', targetUserId)
    .eq('liked_id', req.user.id)
    .maybeSingle();

  const newQuota = await getLikeQuota(req.user.id, req.user.isPremium, requestTimeZone);

  if (reciprocalLike) {
    const [user_one_id, user_two_id] = [req.user.id, targetUserId].sort();
    await supabase.from('matches').upsert({ user_one_id, user_two_id });
    void sendPushToUser({
      userId: targetUserId,
      title: 'Nouveau Match ! 💖',
      body: 'Quelqu\'un a matché avec vous.',
      data: { type: 'MATCH' },
    });
    return res.json({
      liked: true,
      superLiked: !!isSuperLike,
      matched: true,
      likeQuota: newQuota,
    });
  }

  if (isSuperLike) {
    void sendPushToUser({
      userId: targetUserId,
      title: 'Super Like recu',
      body: `${req.authUser?.user_metadata?.name || 'Un membre'} a montre un fort interet pour votre profil.`,
      data: { type: 'SUPER_LIKE', fromUserId: req.user.id },
    });
  }

  return res.json({
    liked: true,
    superLiked: !!isSuperLike,
    matched: false,
    likeQuota: newQuota,
  });
});

app.post('/api/messages/send', requireAuth, async (req, res) => {
  const { matchId, content, messageType = 'TEXT', mediaPath, mediaMimeType, mediaSizeBytes, recipientId } = req.body;
  const normalizedType = String(messageType || 'TEXT').toUpperCase();

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('id, user_one_id, user_two_id, status')
    .eq('id', matchId)
    .maybeSingle();

  if (matchError) return res.status(500).json({ error: matchError.message });
  if (!match) return res.status(404).json({ error: 'match_not_found' });
  if (match.status !== 'ACTIVE') return res.status(403).json({ error: 'match_inactive' });

  const isParticipant = match.user_one_id === req.user.id || match.user_two_id === req.user.id;
  if (!isParticipant) return res.status(403).json({ error: 'match_participant_required' });

  const otherUserId = match.user_one_id === req.user.id ? match.user_two_id : match.user_one_id;
  const { data: blockRows, error: blockError } = await supabase
    .from('blocks')
    .select('id')
    .or(`and(user_id.eq.${req.user.id},blocked_user_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},blocked_user_id.eq.${req.user.id})`);

  if (blockError) return res.status(500).json({ error: blockError.message });
  if ((blockRows || []).length > 0) return res.status(403).json({ error: 'conversation_blocked' });

  let moderationViolation = null;
  if (normalizedType === 'TEXT') {
    moderationViolation = detectTextModerationViolation(content);
  } else if (normalizedType === 'IMAGE') {
    if (!req.user.isPremium) return res.status(403).json({ error: 'premium_required' });
    moderationViolation = detectImageModerationViolation({ mediaPath, mediaMimeType, mediaSizeBytes });
  } else if (normalizedType === 'VIDEO') {
    if (!req.user.isPremium) return res.status(403).json({ error: 'premium_required' });
    moderationViolation = detectVideoModerationViolation({ mediaPath, mediaMimeType, mediaSizeBytes });
  } else {
    moderationViolation = 'unsupported_message_type';
  }

  if (moderationViolation === 'content_inappropriate') {
    return res.status(422).json({ error: 'content_inappropriate' });
  }

  if (moderationViolation) {
    return res.status(400).json({ error: moderationViolation });
  }

  const insertPayload = {
    match_id: matchId,
    sender_id: req.user.id,
    content: normalizedType === 'TEXT' ? String(content).trim() : null,
    message_type: normalizedType,
    media_url: mediaPath || null,
    metadata: {
      media_mime_type: mediaMimeType || null,
      media_size_bytes: Number(mediaSizeBytes || 0),
    },
  };

  const { data: message, error } = await supabase
    .from('messages')
    .insert(insertPayload)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  if (recipientId || otherUserId) {
    const bodyPreview = normalizedType === 'TEXT' ? String(content).slice(0, 50) : 'Media shared';
    void sendPushToUser({
      userId: otherUserId,
      title: 'Nouveau message 💬',
      body: bodyPreview.length > 50 ? `${bodyPreview.slice(0, 47)}...` : bodyPreview,
      data: { type: 'MESSAGE', matchId },
    });
  }

  return res.json({ message });
});

app.post('/api/messages/read', requireAuth, async (req, res) => {
  const { matchId } = req.body;

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('id, user_one_id, user_two_id')
    .eq('id', matchId)
    .maybeSingle();

  if (matchError) return res.status(500).json({ error: matchError.message });
  if (!match) return res.status(404).json({ error: 'match_not_found' });

  const isParticipant = match.user_one_id === req.user.id || match.user_two_id === req.user.id;
  if (!isParticipant) return res.status(403).json({ error: 'match_participant_required' });

  const otherUserId = match.user_one_id === req.user.id ? match.user_two_id : match.user_one_id;
  const { data: blockRows, error: blockError } = await supabase
    .from('blocks')
    .select('id')
    .or(`and(user_id.eq.${req.user.id},blocked_user_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},blocked_user_id.eq.${req.user.id})`);

  if (blockError) return res.status(500).json({ error: blockError.message });
  if ((blockRows || []).length > 0) return res.status(403).json({ error: 'conversation_blocked' });

  const readAt = new Date().toISOString();
  const { data: updatedMessages, error: updateError } = await supabase
    .from('messages')
    .update({ is_read: true, read_at: readAt })
    .eq('match_id', matchId)
    .neq('sender_id', req.user.id)
    .eq('is_read', false)
    .select('id');

  if (updateError) return res.status(500).json({ error: updateError.message });

  return res.json({
    readAt,
    updatedCount: (updatedMessages || []).length,
  });
});

app.post('/api/moderation/report', requireAuth, async (req, res) => {
  const {
    reportedUserId,
    reason,
    details,
    category,
    description,
  } = req.body;

  const normalizedReason = reason || category;
  const normalizedDetails = details || description || null;
  if (!reportedUserId || !normalizedReason) {
    return res.status(400).json({ error: 'invalid_report_payload' });
  }

  const { data: report, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: req.user.id,
      reported_user_id: reportedUserId,
      reason: normalizedReason,
      details: normalizedDetails,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ report });
});

app.post('/api/moderation/block', requireAuth, async (req, res) => {
  const { blockedUserId, reason } = req.body;
  if (!blockedUserId || blockedUserId === req.user.id) {
    return res.status(400).json({ error: 'invalid_block_target' });
  }

  const { error } = await supabase.from('blocks').upsert({
    user_id: req.user.id,
    blocked_user_id: blockedUserId,
    reason: reason || null,
  });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true });
});

app.post('/api/moderation/photos/check', requireAuth, async (req, res) => {
  const photoUrls = Array.isArray(req.body?.photoUrls) ? req.body.photoUrls : [];
  if (photoUrls.length < 3 || photoUrls.length > 6) {
    return res.status(400).json({ error: 'invalid_photo_count' });
  }

  const allowedExtensions = new Set(['jpg', 'jpeg', 'png', 'webp']);
  const violations = [];

  for (const rawUrl of photoUrls) {
    const url = String(rawUrl || '').trim();
    const flags = [];
    const bucketPath = extractBucketPathFromUrl(url, 'photos');

    if (!url || !bucketPath) {
      flags.push('invalid_url');
    } else {
      if (!bucketPath.startsWith(`${req.user.id}/`)) {
        flags.push('not_owned');
      }

      const extension = bucketPath.split('.').pop()?.toLowerCase() || '';
      if (!allowedExtensions.has(extension)) {
        flags.push('invalid_extension');
      }

      if (/[<>:"|?*]/.test(bucketPath) || bucketPath.includes('..')) {
        flags.push('suspicious_filename');
      }
    }

    if (flags.length > 0) {
      violations.push({ url, flags });
    }
  }

  if (violations.length > 0) {
    return res.json({ status: 'REJECTED', violations });
  }

  const reviewRows = photoUrls.map((photoUrl) => ({
    user_id: req.user.id,
    photo_url: String(photoUrl).trim(),
    status: 'PENDING',
  }));

  const { error } = await supabase.from('photo_review_queue').insert(reviewRows);
  if (error && error.code !== '42P01') {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ status: 'PENDING', violations: [] });
});

app.get('/api/kyc/me', requireAuth, async (req, res) => {
  const { data: requests, error } = await supabase
    .from('kyc_verifications')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error?.code === '42P01') return res.status(503).json({ error: 'kyc_not_initialized' });
  if (error) return res.status(500).json({ error: error.message });

  const history = (requests || []).map((request) => ({
    id: request.id,
    status: request.status,
    document_type: request.document_type,
    submitted_at: request.created_at,
    reviewed_at: request.reviewed_at || null,
    rejection_reason: request.rejection_reason || null,
  }));

  return res.json({
    is_verified: !!req.user.isVerified,
    current: history[0] || null,
    history,
  });
});

app.post('/api/kyc/requests', requireAuth, async (req, res) => {
  const normalizedDocumentType = normalizeKycDocumentType(req.body?.document_type || req.body?.documentType);
  const documentFrontPath = String(req.body?.document_front_path || req.body?.documentUrl || '').trim();
  const documentBackPath = String(req.body?.document_back_path || '').trim();
  const selfiePath = String(req.body?.selfie_path || req.body?.selfieUrl || '').trim();
  const selfieCaptureMode = String(req.body?.selfie_capture_mode || '').trim().toUpperCase();
  const selfieCapturedAt = String(req.body?.selfie_captured_at || '').trim();

  if (req.user.isVerified) {
    return res.status(400).json({ error: 'already_verified' });
  }

  if (!normalizedDocumentType) {
    return res.status(400).json({ error: 'invalid_document_type' });
  }

  if (!documentFrontPath || !selfiePath) {
    return res.status(400).json({ error: 'missing_required_documents' });
  }

  const requiresBackDocument = normalizedDocumentType === 'ID_CARD' || normalizedDocumentType === 'DRIVERS_LICENSE';
  if (requiresBackDocument && !documentBackPath) {
    return res.status(400).json({ error: 'missing_required_documents' });
  }

  if (selfieCaptureMode !== 'CAMERA') {
    return res.status(400).json({ error: 'selfie_live_capture_required' });
  }

  const capturedAtTs = Date.parse(selfieCapturedAt);
  if (!Number.isFinite(capturedAtTs)) {
    return res.status(400).json({ error: 'invalid_selfie_capture_timestamp' });
  }
  if (Date.now() - capturedAtTs > 15 * 60 * 1000) {
    return res.status(400).json({ error: 'selfie_capture_too_old' });
  }

  const pathsToValidate = documentBackPath
    ? [documentFrontPath, documentBackPath, selfiePath]
    : [documentFrontPath, selfiePath];
  const hasInvalidPath = pathsToValidate.some((path) => (
    !path.startsWith(`${req.user.id}/`) || path.includes('..')
  ));
  if (hasInvalidPath) {
    return res.status(400).json({ error: 'invalid_document_paths' });
  }

  const { data: requestRow, error } = await supabase
    .from('kyc_verifications')
    .insert({
      user_id: req.user.id,
      document_type: normalizedDocumentType,
      document_url: documentFrontPath,
      document_back_url: documentBackPath || null,
      selfie_url: selfiePath,
      status: 'PENDING',
    })
    .select()
    .single();

  if (error?.code === '42P01') return res.status(503).json({ error: 'kyc_not_initialized' });
  if (error?.code === '23505') return res.status(400).json({ error: 'kyc_request_already_open' });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({
    request: {
      id: requestRow.id,
      status: requestRow.status,
      document_type: requestRow.document_type,
      submitted_at: requestRow.created_at,
      reviewed_at: requestRow.reviewed_at || null,
      rejection_reason: requestRow.rejection_reason || null,
      has_document_back: !!requestRow.document_back_url,
    },
  });
});

app.post('/api/privacy/request', requireAuth, async (req, res) => {
  const requestType = normalizePrivacyRequestType(req.body?.requestType);
  if (!requestType) return res.status(400).json({ error: 'invalid_privacy_request_type' });

  const { data, error } = await supabase
    .from('privacy_requests')
    .insert({
      user_id: req.user.id,
      request_type: requestType,
      status: 'PENDING',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({
    request: {
      id: data.id,
      request_type: mapPrivacyRequestTypeForClient(data.request_type),
      status: mapPrivacyStatusForClient(data.status),
      created_at: data.created_at,
    },
  });
});

app.get('/api/privacy/export', requireAuth, async (req, res) => {
  const userId = req.user.id;

  const [
    profileResponse,
    subscriptionsResponse,
    likesSentResponse,
    likesReceivedResponse,
    passesSentResponse,
    matchesResponse,
    blocksResponse,
    reportsFiledResponse,
    reportsReceivedResponse,
    privacyRequestsResponse,
    kycRequestsResponse,
    communitiesCreatedResponse,
    communityMembershipsResponse,
    pushTokensResponse,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('subscriptions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('likes').select('*').eq('liker_id', userId).order('created_at', { ascending: false }),
    supabase.from('likes').select('*').eq('liked_id', userId).order('created_at', { ascending: false }),
    supabase.from('passes').select('*').eq('passer_id', userId).order('created_at', { ascending: false }),
    supabase.from('matches').select('*').or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`).order('created_at', { ascending: false }),
    supabase.from('blocks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('reports').select('*').eq('reporter_id', userId).order('created_at', { ascending: false }),
    supabase.from('reports').select('*').eq('reported_user_id', userId).order('created_at', { ascending: false }),
    supabase.from('privacy_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('kyc_verifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('communities').select('*').eq('creator_id', userId).order('created_at', { ascending: false }),
    supabase.from('community_members').select('*').eq('user_id', userId).order('joined_at', { ascending: false }),
    supabase.from('push_tokens').select('token, platform, created_at, is_active').eq('user_id', userId).order('created_at', { ascending: false }),
  ]);

  const responses = [
    profileResponse,
    subscriptionsResponse,
    likesSentResponse,
    likesReceivedResponse,
    passesSentResponse,
    matchesResponse,
    blocksResponse,
    reportsFiledResponse,
    reportsReceivedResponse,
    privacyRequestsResponse,
    kycRequestsResponse,
    communitiesCreatedResponse,
    communityMembershipsResponse,
    pushTokensResponse,
  ];

  const failedResponse = responses.find((response) => response.error);
  if (failedResponse?.error) {
    return res.status(500).json({ error: failedResponse.error.message });
  }

  const matchIds = (matchesResponse.data || []).map((match) => match.id);
  const messagesResponse = matchIds.length > 0
    ? await supabase
      .from('messages')
      .select('*')
      .in('match_id', matchIds)
      .order('created_at', { ascending: false })
    : { data: [], error: null };

  if (messagesResponse.error) return res.status(500).json({ error: messagesResponse.error.message });

  const completedAt = new Date().toISOString();
  const { data: exportRequest } = await supabase.from('privacy_requests').insert({
    user_id: userId,
    request_type: 'DATA_EXPORT',
    status: 'COMPLETED',
    completed_at: completedAt,
  }).select().maybeSingle();

  return res.json({
    filename: `yamo-export-${userId}-${completedAt.slice(0, 10)}.json`,
    exported_at: completedAt,
    format: 'json',
    account: {
      id: req.authUser?.id || userId,
      email: req.authUser?.email || null,
      phone: req.authUser?.phone || null,
      created_at: req.authUser?.created_at || null,
      last_sign_in_at: req.authUser?.last_sign_in_at || null,
    },
    profile: profileResponse.data || null,
    subscriptions: subscriptionsResponse.data || [],
    matches: matchesResponse.data || [],
    messages: messagesResponse.data || [],
    likes_sent: likesSentResponse.data || [],
    likes_received: likesReceivedResponse.data || [],
    passes_sent: passesSentResponse.data || [],
    blocks: blocksResponse.data || [],
    reports_filed: reportsFiledResponse.data || [],
    reports_received: reportsReceivedResponse.data || [],
    privacy_requests: [
      ...(privacyRequestsResponse.data || []),
      ...(exportRequest ? [exportRequest] : []),
    ],
    kyc_requests: kycRequestsResponse.data || [],
    communities_created: communitiesCreatedResponse.data || [],
    community_memberships: communityMembershipsResponse.data || [],
    push_tokens: pushTokensResponse.data || [],
  });
});

app.post('/api/account/delete', requireAuth, async (req, res) => {
  const completedAt = new Date().toISOString();

  await supabase.from('privacy_requests').insert({
    user_id: req.user.id,
    request_type: 'ACCOUNT_DELETION',
    status: 'COMPLETED',
    completed_at: completedAt,
  });

  const { error: deleteError } = await supabase.auth.admin.deleteUser(req.user.id);
  if (deleteError) return res.status(500).json({ error: deleteError.message });

  return res.json({ success: true, deleted_at: completedAt });
});

app.post('/api/communities/create', requireAuth, async (req, res) => {
  const normalizedName = String(req.body?.name || '').trim();
  const normalizedDescription = String(req.body?.description || '').trim();
  const cover_photo = String(req.body?.cover_photo || '').trim() || null;

  const subscription = await getActiveSubscriptionPlan(req.user.id);
  const planKey = String(subscription?.plan_id || '').toUpperCase();
  const communityCreationAllowed = COMMUNITY_ELIGIBLE_PLANS.includes(planKey);

  if (!communityCreationAllowed) {
    return res.status(403).json({ error: 'community_creation_plan_required' });
  }

  if (normalizedName.length < 3) {
    return res.status(400).json({ error: 'community_name_too_short' });
  }

  if (!normalizedDescription) {
    return res.status(400).json({ error: 'community_description_required' });
  }

  const { data: community, error } = await supabase
    .from('communities')
    .insert({
      creator_id: req.user.id,
      name: normalizedName,
      description: normalizedDescription,
      cover_photo,
    })
    .select('*')
    .single();

  if (error?.code === '23505') return res.status(400).json({ error: 'community_name_taken' });
  if (error) return res.status(500).json({ error: error.message });

  const { error: memberInsertError } = await supabase.from('community_members').insert({
    community_id: community.id,
    user_id: req.user.id,
    role: 'ADMIN',
  });

  if (memberInsertError) {
    await supabase.from('communities').delete().eq('id', community.id);
    return res.status(500).json({ error: memberInsertError.message });
  }

  return res.status(201).json({
    community: {
      ...community,
      is_member: true,
      my_role: 'ADMIN',
    },
  });
});

app.get('/api/communities', requireAuth, async (req, res) => {
  const { data: communities, error } = await supabase.from('communities').select(`
    *,
    community_members!left(user_id)
  `).order('member_count', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const result = (communities || []).map((community) => ({
    ...community,
    is_member: community.community_members.some((member) => member.user_id === req.user.id),
    community_members: undefined,
  }));

  return res.json(result);
});

app.post('/api/communities/:id/join', requireAuth, async (req, res) => {
  const subscription = await getActiveSubscriptionPlan(req.user.id);
  const planKey = String(subscription?.plan_id || '').toUpperCase();
  const communityAccessAllowed = COMMUNITY_ELIGIBLE_PLANS.includes(planKey) || req.user.isPremium;

  if (!communityAccessAllowed) {
    return res.status(403).json({ error: 'community_plan_required' });
  }

  const { error } = await supabase.from('community_members').insert({
    community_id: req.params.id,
    user_id: req.user.id,
    role: 'MEMBER',
  });

  if (error?.code === '23505') return res.status(400).json({ error: 'already_member' });
  if (error) return res.status(500).json({ error: error.message });

  return res.json({ success: true });
});

app.get('/api/communities/:id/members', requireAuth, async (req, res) => {
  const { membership, error: membershipError } = await getCommunityMembership(req.params.id, req.user.id);
  if (membershipError) return res.status(500).json({ error: membershipError.message });
  if (!membership) return res.status(403).json({ error: 'not_a_member' });

  const { data, error } = await supabase
    .from('community_members')
    .select(`
      user_id,
      role,
      joined_at,
      profiles(name, photos, is_verified, is_premium)
    `)
    .eq('community_id', req.params.id)
    .order('joined_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ members: data || [] });
});

app.post('/api/communities/:id/messages', requireAuth, async (req, res) => {
  const {
    content,
    message_type = 'TEXT',
    media_url,
    mediaMimeType,
    mediaSizeBytes,
  } = req.body;
  const normalizedType = String(message_type || 'TEXT').toUpperCase();

  const { membership, error: membershipError } = await getCommunityMembership(req.params.id, req.user.id);
  if (membershipError) return res.status(500).json({ error: membershipError.message });
  if (!membership) return res.status(403).json({ error: 'not_a_member' });

  let moderationViolation = null;
  if (normalizedType === 'TEXT') {
    moderationViolation = detectTextModerationViolation(content);
  } else if (normalizedType === 'IMAGE') {
    if (!req.user.isPremium) return res.status(403).json({ error: 'premium_required' });
    moderationViolation = detectImageModerationViolation({
      mediaPath: media_url,
      mediaMimeType,
      mediaSizeBytes,
    });
  } else if (normalizedType === 'VIDEO') {
    if (!req.user.isPremium) return res.status(403).json({ error: 'premium_required' });
    moderationViolation = detectVideoModerationViolation({
      mediaPath: media_url,
      mediaMimeType,
      mediaSizeBytes,
    });
  } else {
    moderationViolation = 'unsupported_message_type';
  }

  if (moderationViolation === 'content_inappropriate') {
    return res.status(422).json({ error: 'content_inappropriate' });
  }

  if (moderationViolation) {
    return res.status(400).json({ error: moderationViolation });
  }

  const { data: message, error } = await supabase.from('community_messages')
    .insert({
      community_id: req.params.id,
      sender_id: req.user.id,
      content: normalizedType === 'TEXT' ? String(content).trim() : null,
      message_type: normalizedType,
      media_url,
    })
    .select('*, profiles(name, photos)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(message);
});

app.get('/api/communities/:id/messages', requireAuth, async (req, res) => {
  const { membership, error: membershipError } = await getCommunityMembership(req.params.id, req.user.id);
  if (membershipError) return res.status(500).json({ error: membershipError.message });
  if (!membership) return res.status(403).json({ error: 'not_a_member' });

  const { data, error } = await supabase.from('community_messages')
    .select('*, profiles(name, photos)')
    .eq('community_id', req.params.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

app.patch('/api/communities/:id/members/:userId/role', requireAuth, async (req, res) => {
  const targetRole = normalizeCommunityRole(req.body?.role);
  if (!targetRole) return res.status(400).json({ error: 'invalid_community_role' });

  const { membership: actorMembership, error: actorMembershipError } = await getCommunityMembership(req.params.id, req.user.id);
  if (actorMembershipError) return res.status(500).json({ error: actorMembershipError.message });
  if (!actorMembership) return res.status(403).json({ error: 'not_a_member' });
  if (actorMembership.role !== 'ADMIN') return res.status(403).json({ error: 'community_admin_required' });

  const { membership: targetMembership, error: targetMembershipError } = await getCommunityMembership(req.params.id, req.params.userId);
  if (targetMembershipError) return res.status(500).json({ error: targetMembershipError.message });
  if (!targetMembership) return res.status(404).json({ error: 'community_member_not_found' });

  if (targetMembership.role === 'ADMIN' && targetRole !== 'ADMIN') {
    const { count: adminCount, error: adminCountError } = await getCommunityAdminCount(req.params.id);
    if (adminCountError) return res.status(500).json({ error: adminCountError.message });
    if (adminCount <= 1) return res.status(400).json({ error: 'last_admin_required' });
  }

  const { data, error } = await supabase
    .from('community_members')
    .update({ role: targetRole })
    .eq('community_id', req.params.id)
    .eq('user_id', req.params.userId)
    .select(`
      user_id,
      role,
      joined_at,
      profiles(name, photos, is_verified, is_premium)
    `)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ member: data });
});

app.delete('/api/communities/:id/members/:userId', requireAuth, async (req, res) => {
  const communityId = req.params.id;
  const targetUserId = req.params.userId;

  const { membership: actorMembership, error: actorMembershipError } = await getCommunityMembership(communityId, req.user.id);
  if (actorMembershipError) return res.status(500).json({ error: actorMembershipError.message });
  if (!actorMembership) return res.status(403).json({ error: 'not_a_member' });

  const { membership: targetMembership, error: targetMembershipError } = await getCommunityMembership(communityId, targetUserId);
  if (targetMembershipError) return res.status(500).json({ error: targetMembershipError.message });
  if (!targetMembership) return res.status(404).json({ error: 'community_member_not_found' });

  const isSelfRemoval = targetUserId === req.user.id;
  if (!isSelfRemoval) {
    const actorCanRemoveMember = actorMembership.role === 'ADMIN'
      || (actorMembership.role === 'MODERATOR' && targetMembership.role === 'MEMBER');
    if (!actorCanRemoveMember) {
      return res.status(403).json({ error: 'community_member_management_denied' });
    }
  }

  if (targetMembership.role === 'ADMIN') {
    const { count: adminCount, error: adminCountError } = await getCommunityAdminCount(communityId);
    if (adminCountError) return res.status(500).json({ error: adminCountError.message });
    if (adminCount <= 1) return res.status(400).json({ error: 'last_admin_required' });
  }

  const { error } = await supabase
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', targetUserId);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true });
});

app.get('/api/notifications/admin', requireAuth, async (req, res) => {
  const limit = Math.max(1, Math.min(50, Number(req.query?.limit) || 10));
  const { data, error } = await supabase
    .from('events')
    .select('id, event_name, metadata, created_at')
    .eq('event_type', 'ADMIN_NOTIFICATION')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });

  const notifications = (data || []).map((eventRow) => ({
    id: eventRow.id,
    event_name: eventRow.event_name,
    is_read: eventRow.metadata?.is_read === true,
    metadata: eventRow.metadata || {},
    created_at: eventRow.created_at,
  }));

  return res.json({
    notifications,
    unreadCount: notifications.filter((notification) => notification.is_read !== true).length,
  });
});

app.post('/api/notifications/admin/:id/read', requireAuth, async (req, res) => {
  const { data: notification, error: notificationError } = await supabase
    .from('events')
    .select('id, metadata')
    .eq('id', req.params.id)
    .eq('event_type', 'ADMIN_NOTIFICATION')
    .eq('user_id', req.user.id)
    .maybeSingle();

  if (notificationError) return res.status(500).json({ error: notificationError.message });
  if (!notification) return res.status(404).json({ error: 'notification_not_found' });

  const updatedMetadata = {
    ...(notification.metadata || {}),
    is_read: true,
    read_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('events')
    .update({ metadata: updatedMetadata })
    .eq('id', notification.id);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true });
});

app.post('/api/notifications/admin/read-all', requireAuth, async (req, res) => {
  const { data: notifications, error: notificationsError } = await supabase
    .from('events')
    .select('id, metadata')
    .eq('event_type', 'ADMIN_NOTIFICATION')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(200);

  if (notificationsError) return res.status(500).json({ error: notificationsError.message });

  const readAt = new Date().toISOString();
  await Promise.all((notifications || []).map((notification) => (
    supabase
      .from('events')
      .update({
        metadata: {
          ...(notification.metadata || {}),
          is_read: true,
          read_at: readAt,
        },
      })
      .eq('id', notification.id)
  )));

  return res.json({ success: true });
});

adminRouter.get('/users', async (req, res) => {
  const [{ data: profiles, error: profilesError }, { users: authUsers, error: authUsersError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false }),
    listAllAuthUsers(),
  ]);

  if (profilesError) return res.status(500).json({ error: profilesError.message });
  if (authUsersError) return res.status(500).json({ error: authUsersError.message });

  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const authIds = new Set((authUsers || []).map((authUser) => authUser.id));

  const mergedUsers = (authUsers || []).map((authUser) => {
    const profile = profileById.get(authUser.id);
    const metadata = authUser.user_metadata || {};
    return {
      id: authUser.id,
      email: authUser.email || null,
      phone: authUser.phone || metadata.phone || null,
      name: profile?.name || metadata.name || authUser.email?.split('@')[0] || 'Utilisateur',
      age: profile?.age || Math.max(18, toFiniteNumber(metadata.age) || 18),
      gender: profile?.gender || metadata.gender || 'OTHER',
      bio: profile?.bio || metadata.bio || '',
      photos: profile?.photos || [],
      interests: profile?.interests || [],
      location: profile?.location || null,
      city: profile?.city || metadata.city || null,
      country: profile?.country || metadata.country || null,
      isVerified: !!profile?.is_verified,
      isPremium: !!profile?.is_premium,
      likes_count: profile?.likes_count || 0,
      preferences: {
        targetGender: profile?.target_gender || [],
        minAge: 18,
        maxAge: 35,
        maxDistance: 50,
      },
      is_admin: !!profile?.is_admin,
      is_premium: !!profile?.is_premium,
      is_verified: !!profile?.is_verified,
      is_invisible: !!profile?.is_invisible,
      suspended_at: profile?.suspended_at || null,
      photo_review_status: profile?.photo_review_status || null,
      created_at: profile?.created_at || authUser.created_at || null,
      integrity_status: profile ? 'OK' : 'PROFILE_MISSING',
    };
  });

  const orphanProfiles = (profiles || [])
    .filter((profile) => !authIds.has(profile.id))
    .map((profile) => ({
      id: profile.id,
      email: null,
      phone: profile.phone || null,
      name: profile.name,
      age: profile.age,
      gender: profile.gender,
      bio: profile.bio || '',
      photos: profile.photos || [],
      interests: profile.interests || [],
      location: profile.location || null,
      city: profile.city || null,
      country: profile.country || null,
      isVerified: !!profile.is_verified,
      isPremium: !!profile.is_premium,
      likes_count: profile.likes_count || 0,
      preferences: {
        targetGender: profile.target_gender || [],
        minAge: 18,
        maxAge: 35,
        maxDistance: 50,
      },
      is_admin: !!profile.is_admin,
      is_premium: !!profile.is_premium,
      is_verified: !!profile.is_verified,
      is_invisible: !!profile.is_invisible,
      suspended_at: profile.suspended_at || null,
      photo_review_status: profile.photo_review_status || null,
      created_at: profile.created_at || null,
      integrity_status: 'AUTH_USER_MISSING',
    }));

  return res.json([...mergedUsers, ...orphanProfiles]);
});

adminRouter.delete('/users/:id', async (req, res) => {
  const { data: targetProfile, error: targetProfileError } = await supabase
    .from('profiles')
    .select('id, is_admin, suspended_at')
    .eq('id', req.params.id)
    .maybeSingle();

  if (targetProfileError) return res.status(500).json({ error: targetProfileError.message });
  if (targetProfile?.is_admin) return res.status(403).json({ error: 'cannot_delete_admin' });

  const { error: deleteError } = await supabase.auth.admin.deleteUser(req.params.id);
  if (deleteError) return res.status(500).json({ error: deleteError.message });

  await logAdminAction({
    adminId: req.user.id,
    action: 'USER_DELETE_ADMIN',
    targetId: req.params.id,
    targetType: 'profile',
    oldData: {
      suspended_at: targetProfile?.suspended_at || null,
      is_admin: !!targetProfile?.is_admin,
    },
    newData: {
      reason: 'admin_delete',
      deleted_at: new Date().toISOString(),
    },
  });

  return res.json({ success: true });
});

adminRouter.post('/users/reconcile-profiles', async (req, res) => {
  const [{ users: authUsers, error: authUsersError }, { data: profiles, error: profilesError }] = await Promise.all([
    listAllAuthUsers(),
    supabase.from('profiles').select('id'),
  ]);

  if (authUsersError) return res.status(500).json({ error: authUsersError.message });
  if (profilesError) return res.status(500).json({ error: profilesError.message });

  const existingProfileIds = new Set((profiles || []).map((profile) => profile.id));
  const missingAuthUsers = (authUsers || []).filter((authUser) => !existingProfileIds.has(authUser.id));
  const reconciliableProfiles = missingAuthUsers
    .map((authUser) => buildReconciledProfilePayload(authUser))
    .filter(Boolean);

  let createdCount = 0;
  if (reconciliableProfiles.length > 0) {
    const { data: createdRows, error: insertError } = await supabase
      .from('profiles')
      .insert(reconciliableProfiles)
      .select('id');

    if (insertError) return res.status(500).json({ error: insertError.message });
    createdCount = (createdRows || []).length;
  }

  await logAdminAction({
    adminId: req.user.id,
    action: 'PROFILE_RECONCILE_RUN',
    targetId: null,
    targetType: 'auth_integrity',
    newData: {
      missing_before: missingAuthUsers.length,
      created_count: createdCount,
      skipped_count: missingAuthUsers.length - createdCount,
    },
  });

  return res.json({
    createdCount,
    missingBefore: missingAuthUsers.length,
    skippedCount: missingAuthUsers.length - createdCount,
    totalAuthUsers: (authUsers || []).length,
    totalProfiles: (profiles || []).length + createdCount,
  });
});

adminRouter.put('/users/:id/suspend', async (req, res) => {
  const { data: targetProfile, error: targetProfileError } = await supabase
    .from('profiles')
    .select('id, is_admin, suspended_at')
    .eq('id', req.params.id)
    .maybeSingle();

  if (targetProfileError) return res.status(500).json({ error: targetProfileError.message });
  if (!targetProfile) return res.status(404).json({ error: 'user_not_found' });
  if (targetProfile.is_admin) return res.status(403).json({ error: 'cannot_suspend_admin' });

  const suspendFlag = req.body?.suspend;
  const suspendedFlag = req.body?.suspended;
  const shouldSuspend = typeof suspendFlag === 'boolean'
    ? suspendFlag
    : (typeof suspendedFlag === 'boolean' ? suspendedFlag : true);
  const suspended_at = shouldSuspend ? new Date().toISOString() : null;
  const { error } = await supabase.from('profiles').update({ suspended_at }).eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });

  await logAdminAction({
    adminId: req.user.id,
    action: 'USER_SUSPEND_UPDATED',
    targetId: req.params.id,
    targetType: 'profile',
    oldData: { suspended_at: targetProfile.suspended_at || null },
    newData: { suspended_at },
  });

  if (shouldSuspend) {
    void sendPushToUser({
      userId: req.params.id,
      title: 'Compte suspendu',
      body: 'Votre compte a été suspendu par l’équipe de modération.',
      data: { type: 'SYSTEM', event: 'ACCOUNT_SUSPENDED' },
    });
  }

  return res.json({ success: true, suspended_at });
});

adminRouter.get('/kyc/requests', async (req, res) => {
  let query = supabase
    .from('kyc_verifications')
    .select('*')
    .order('created_at', { ascending: false });

  const statusFilter = String(req.query?.status || '').trim().toUpperCase();
  if (statusFilter && statusFilter !== 'ALL') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const userIds = [...new Set((data || []).map((request) => request.user_id).filter(Boolean))];
  const { data: profiles, error: profilesError } = userIds.length > 0
    ? await supabase
      .from('profiles')
      .select('id, name, is_verified, is_premium, suspended_at, photos')
      .in('id', userIds)
    : { data: [], error: null };

  if (profilesError) return res.status(500).json({ error: profilesError.message });

  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const requests = await Promise.all((data || []).map(async (request) => {
    const user = profileById.get(request.user_id);
    return {
      id: request.id,
      user_id: request.user_id,
      document_type: request.document_type,
      status: request.status,
      submitted_at: request.created_at,
      reviewed_at: request.reviewed_at || null,
      rejection_reason: request.rejection_reason || null,
      document_front_url: await createSignedStorageUrl('kyc-docs', request.document_url),
      document_back_url: await createSignedStorageUrl('kyc-docs', request.document_back_url),
      selfie_url: await createSignedStorageUrl('kyc-docs', request.selfie_url),
      user: {
        id: request.user_id,
        name: user?.name || 'Utilisateur',
        email: null,
        is_verified: !!user?.is_verified,
        is_premium: !!user?.is_premium,
        suspended_at: user?.suspended_at || null,
        photo: user?.photos?.[0] || null,
      },
    };
  }));

  return res.json({ requests });
});

adminRouter.post('/kyc/requests/:id/review', async (req, res) => {
  const decision = String(req.body?.decision || req.body?.status || 'IN_REVIEW').trim().toUpperCase();
  const status = decision === 'APPROVED' || decision === 'REJECTED' ? decision : 'IN_REVIEW';
  const rejection_reason = req.body?.reason || req.body?.rejectionReason || null;
  const reviewed_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('kyc_verifications')
    .update({
      status,
      reviewed_by: req.user.id,
      reviewed_at,
      rejection_reason,
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const profilePatch = {};
  if (status === 'APPROVED') {
    profilePatch.is_verified = true;
    profilePatch.is_kyc_verified = true;
  } else if (status === 'REJECTED') {
    profilePatch.is_kyc_verified = false;
  }

  if (Object.keys(profilePatch).length > 0) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update(profilePatch)
      .eq('id', data.user_id);
    if (profileError) return res.status(500).json({ error: profileError.message });
  }

  await logAdminAction({
    adminId: req.user.id,
    action: 'KYC_REVIEWED',
    targetId: data.user_id,
    targetType: 'kyc_verification',
    newData: {
      request_id: data.id,
      status: data.status,
      rejection_reason: data.rejection_reason || null,
    },
  });

  return res.json({
    request: {
      id: data.id,
      user_id: data.user_id,
      status: data.status,
      reviewed_at: data.reviewed_at,
      rejection_reason: data.rejection_reason || null,
    },
  });
});

adminRouter.get('/reports', async (req, res) => {
  let query = supabase.from('reports').select('*').order('created_at', { ascending: false });
  const status = normalizeReportStatusForDb(req.query?.status);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const profileIds = [...new Set((data || []).flatMap((report) => [report.reporter_id, report.reported_user_id]).filter(Boolean))];
  const { data: profiles, error: profilesError } = profileIds.length > 0
    ? await supabase
      .from('profiles')
      .select('id, name')
      .in('id', profileIds)
    : { data: [], error: null };

  if (profilesError) return res.status(500).json({ error: profilesError.message });

  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const reports = (data || []).map((report) => ({
    id: report.id,
    status: mapReportStatusForClient(report.status),
    category: report.reason,
    target_type: 'PROFILE',
    description: report.details || '',
    created_at: report.created_at,
    reporter: report.reporter_id ? {
      id: report.reporter_id,
      name: profileById.get(report.reporter_id)?.name || 'Utilisateur',
      email: null,
    } : null,
    reported_user: report.reported_user_id ? {
      id: report.reported_user_id,
      name: profileById.get(report.reported_user_id)?.name || 'Utilisateur',
      email: null,
    } : null,
  }));

  return res.json({ reports });
});

adminRouter.post('/reports/:id/review', async (req, res) => {
  const normalizedStatus = normalizeReportStatusForDb(req.body?.status) || 'RESOLVED';
  const { data, error } = await supabase
    .from('reports')
    .update({ status: normalizedStatus })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  if (req.body?.suspendReportedUser === true && data.reported_user_id) {
    await supabase
      .from('profiles')
      .update({ suspended_at: new Date().toISOString() })
      .eq('id', data.reported_user_id);
  }

  await logAdminAction({
    adminId: req.user.id,
    action: 'REPORT_REVIEWED',
    targetId: data.reported_user_id || null,
    targetType: 'report',
    newData: {
      report_id: data.id,
      status: data.status,
      suspend_reported_user: req.body?.suspendReportedUser === true,
      remove_message_content: req.body?.removeMessageContent === true,
    },
  });

  return res.json({
    report: {
      id: data.id,
      status: mapReportStatusForClient(data.status),
    },
  });
});

adminRouter.get('/privacy-requests', async (req, res) => {
  let query = supabase
    .from('privacy_requests')
    .select('*')
    .order('created_at', { ascending: false });

  const limit = Math.max(1, Math.min(200, Number(req.query?.limit) || 100));
  query = query.limit(limit);

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });
  return res.json({
    requests: (data || []).map((request) => ({
      id: request.id,
      user_id: request.user_id,
      request_type: mapPrivacyRequestTypeForClient(request.request_type),
      status: mapPrivacyStatusForClient(request.status),
      details: null,
      created_at: request.created_at,
      resolved_at: request.completed_at || null,
    })),
  });
});

adminRouter.post('/privacy-requests/:id/resolve', async (req, res) => {
  const status = normalizePrivacyStatusForDb(req.body?.status) || 'COMPLETED';
  const completed_at = status === 'COMPLETED' || status === 'FAILED' ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from('privacy_requests')
    .update({ status, completed_at })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  if (req.body?.executeDelete === true && data.request_type === 'ACCOUNT_DELETION') {
    const { error: deleteError } = await supabase.auth.admin.deleteUser(data.user_id);
    if (deleteError) return res.status(500).json({ error: deleteError.message });
  }

  await logAdminAction({
    adminId: req.user.id,
    action: data.request_type === 'ACCOUNT_DELETION' ? 'USER_DELETE_PRIVACY' : 'PRIVACY_REQUEST_RESOLVED',
    targetId: data.user_id,
    targetType: 'privacy_request',
    newData: {
      request_id: data.id,
      request_type: data.request_type,
      status: data.status,
      execute_delete: req.body?.executeDelete === true,
      reason: req.body?.note || null,
    },
  });

  return res.json({
    request: {
      id: data.id,
      user_id: data.user_id,
      request_type: mapPrivacyRequestTypeForClient(data.request_type),
      status: mapPrivacyStatusForClient(data.status),
      resolved_at: data.completed_at || null,
    },
  });
});

adminRouter.get('/photo-reviews', async (req, res) => {
  const status = String(req.query?.status || 'PENDING').trim().toUpperCase();
  const limit = Math.max(1, Math.min(100, Number(req.query?.limit) || 50));
  const page = Math.max(1, Number(req.query?.page) || 1);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('photo_review_queue')
    .select('*')
    .order('created_at', { ascending: true })
    .range(from, to);

  if (status && status !== 'ALL') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });

  const userIds = [...new Set((data || []).map((review) => review.user_id).filter(Boolean))];
  const { data: profiles, error: profilesError } = userIds.length > 0
    ? await supabase
      .from('profiles')
      .select('id, name')
      .in('id', userIds)
    : { data: [], error: null };

  if (profilesError) return res.status(500).json({ error: profilesError.message });

  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const reviews = (data || []).map((review) => ({
    id: review.id,
    user_id: review.user_id,
    photo_url: review.photo_url,
    status: review.status,
    auto_flags: [],
    created_at: review.created_at,
    user: {
      id: review.user_id,
      name: profileById.get(review.user_id)?.name || 'Utilisateur',
      email: null,
    },
  }));

  return res.json({ reviews, page, hasMore: (data || []).length === limit });
});

adminRouter.post('/photo-reviews/:id/review', async (req, res) => {
  const status = String(req.body?.status || 'APPROVED').trim().toUpperCase();
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'invalid_photo_review_status' });
  }

  const reviewed_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('photo_review_queue')
    .update({
      status,
      reviewed_at,
      rejection_reason: req.body?.note || null,
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const { count: pendingCount, error: pendingError } = await supabase
    .from('photo_review_queue')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', data.user_id)
    .eq('status', 'PENDING');

  if (pendingError) return res.status(500).json({ error: pendingError.message });

  const nextProfileStatus = status === 'REJECTED' ? 'REJECTED' : ((pendingCount || 0) > 0 ? 'PENDING' : 'APPROVED');
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ photo_review_status: nextProfileStatus })
    .eq('id', data.user_id);

  if (profileError) return res.status(500).json({ error: profileError.message });

  await logAdminAction({
    adminId: req.user.id,
    action: 'PHOTO_REVIEWED',
    targetId: data.user_id,
    targetType: 'photo_review',
    newData: {
      review_id: data.id,
      status: data.status,
      profile_photo_review_status: nextProfileStatus,
      reason: data.rejection_reason || null,
    },
  });

  return res.json({
    review: {
      id: data.id,
      status: data.status,
      reviewed_at: data.reviewed_at,
      user_id: data.user_id,
    },
  });
});

adminRouter.get('/stats', async (req, res) => {
  const [
    profilesResponse,
    subscriptionsResponse,
    kycResponse,
    reportsResponse,
    privacyResponse,
    authUsersResponse,
  ] = await Promise.all([
    supabase.from('profiles').select('id, is_admin, is_verified, is_premium, is_invisible, suspended_at'),
    supabase.from('subscriptions').select('plan_id, status, current_period_end'),
    supabase.from('kyc_verifications').select('status, created_at'),
    supabase.from('reports').select('status'),
    supabase.from('privacy_requests').select('status'),
    listAllAuthUsers(),
  ]);

  if (profilesResponse.error) return res.status(500).json({ error: profilesResponse.error.message });
  if (subscriptionsResponse.error) return res.status(500).json({ error: subscriptionsResponse.error.message });
  if (kycResponse.error) return res.status(500).json({ error: kycResponse.error.message });
  if (reportsResponse.error) return res.status(500).json({ error: reportsResponse.error.message });
  if (privacyResponse.error) return res.status(500).json({ error: privacyResponse.error.message });
  if (authUsersResponse.error) return res.status(500).json({ error: authUsersResponse.error.message });

  const profiles = profilesResponse.data || [];
  const authUsers = authUsersResponse.users || [];
  const profileIds = new Set(profiles.map((profile) => profile.id));
  const activeProfiles = profiles.filter((profile) => !profile.suspended_at);
  const activeSubscriptions = (subscriptionsResponse.data || []).filter((subscription) => (
    subscription.status === 'active'
      && (!subscription.current_period_end || new Date(subscription.current_period_end).getTime() > Date.now())
  ));
  const planCounters = { MONTHLY: 0, QUARTERLY: 0, BIANNUAL: 0, ANNUAL: 0, UNKNOWN: 0 };
  for (const subscription of activeSubscriptions) {
    const key = String(subscription.plan_id || '').toUpperCase();
    if (Object.prototype.hasOwnProperty.call(planCounters, key)) {
      planCounters[key] += 1;
    } else {
      planCounters.UNKNOWN += 1;
    }
  }

  const kycRows = kycResponse.data || [];
  const reports = reportsResponse.data || [];
  const privacyRequests = privacyResponse.data || [];
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return res.json({
    generatedAt: new Date().toISOString(),
    users: {
      total: profiles.length,
      active: activeProfiles.length,
      suspended: profiles.filter((profile) => !!profile.suspended_at).length,
      admins: profiles.filter((profile) => profile.is_admin).length,
      verified: profiles.filter((profile) => profile.is_verified).length,
      unverified: profiles.filter((profile) => !profile.is_verified).length,
      premium: profiles.filter((profile) => profile.is_premium).length,
      free: profiles.filter((profile) => !profile.is_premium).length,
      invisiblePremium: profiles.filter((profile) => profile.is_premium && profile.is_invisible).length,
    },
    premiumByPlan: planCounters,
    kyc: {
      totalRequests: kycRows.length,
      pending: kycRows.filter((row) => row.status === 'PENDING').length,
      inReview: kycRows.filter((row) => row.status === 'IN_REVIEW').length,
      approved: kycRows.filter((row) => row.status === 'APPROVED').length,
      rejected: kycRows.filter((row) => row.status === 'REJECTED').length,
      requestsLast7Days: kycRows.filter((row) => new Date(row.created_at).getTime() >= sevenDaysAgo).length,
    },
    moderation: {
      reportsTotal: reports.length,
      reportsOpen: reports.filter((row) => row.status === 'PENDING').length,
      reportsInReview: reports.filter((row) => row.status === 'INVESTIGATING').length,
      reportsResolved: reports.filter((row) => row.status === 'RESOLVED').length,
      reportsDismissed: reports.filter((row) => row.status === 'DISMISSED').length,
    },
    privacy: {
      requestsTotal: privacyRequests.length,
      open: privacyRequests.filter((row) => row.status === 'PENDING').length,
      inProgress: privacyRequests.filter((row) => row.status === 'PROCESSING').length,
      resolved: privacyRequests.filter((row) => row.status === 'COMPLETED').length,
      rejected: privacyRequests.filter((row) => row.status === 'FAILED').length,
    },
    integrity: {
      authUsersTotal: authUsers.length,
      profilesTotal: profiles.length,
      authUsersWithoutProfile: authUsers.filter((user) => !profileIds.has(user.id)).length,
    },
  });
});

adminRouter.get('/audit-logs', async (req, res) => {
  const limit = Math.max(1, Math.min(500, Number(req.query?.limit) || 100));
  const actionFilter = String(req.query?.action || '').trim();

  let query = supabase
    .from('admin_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (actionFilter) {
    query = query.eq('action', actionFilter);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const relatedProfileIds = [...new Set((data || []).flatMap((row) => [row.admin_id, row.target_id]).filter(Boolean))];
  const { data: profiles, error: profilesError } = relatedProfileIds.length > 0
    ? await supabase
      .from('profiles')
      .select('id, name')
      .in('id', relatedProfileIds)
    : { data: [], error: null };

  if (profilesError) return res.status(500).json({ error: profilesError.message });

  const { users: authUsers, error: authUsersError } = await listAllAuthUsers();
  if (authUsersError) return res.status(500).json({ error: authUsersError.message });

  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const authUserById = new Map((authUsers || []).map((user) => [user.id, user]));

  const logs = (data || []).map((row) => {
    const metadata = row.new_data?.metadata || row.new_data || {};
    const reason = row.new_data?.reason || row.old_data?.reason || null;
    const adminUser = authUserById.get(row.admin_id);
    const targetAuthUser = authUserById.get(row.target_id);
    return {
      id: row.id,
      admin_id: row.admin_id,
      action: row.action,
      target_user_id: row.target_id || null,
      reason,
      metadata,
      created_at: row.created_at,
      admin: row.admin_id ? {
        id: row.admin_id,
        name: profileById.get(row.admin_id)?.name || adminUser?.user_metadata?.name || 'Admin',
        email: adminUser?.email || null,
      } : null,
      target_user: row.target_id ? {
        id: row.target_id,
        name: profileById.get(row.target_id)?.name || targetAuthUser?.user_metadata?.name || 'Utilisateur',
        email: targetAuthUser?.email || null,
      } : null,
    };
  });

  return res.json({ logs });
});

adminRouter.get('/messages/audience', async (req, res) => {
  const segment = normalizeAdminMessageSegment(req.query?.segment);
  if (!segment) return res.status(400).json({ error: 'invalid_segment' });

  const { profiles, error } = await getAdminAudienceProfiles(segment);
  if (error) return res.status(500).json({ error: error.message });

  return res.json({ segment, recipientCount: (profiles || []).length });
});

adminRouter.get('/messages/history', async (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query?.limit) || 20));
  const { data: campaignRows, error: campaignError } = await supabase
    .from('events')
    .select('id, user_id, event_name, payload, metadata, created_at')
    .eq('event_type', 'ADMIN_BROADCAST')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (campaignError) return res.status(500).json({ error: campaignError.message });

  const campaignIds = (campaignRows || []).map((row) => row.event_name).filter(Boolean);
  const { data: notificationRows, error: notificationError } = campaignIds.length > 0
    ? await supabase
      .from('events')
      .select('event_name, metadata')
      .eq('event_type', 'ADMIN_NOTIFICATION')
      .in('event_name', campaignIds)
    : { data: [], error: null };

  if (notificationError) return res.status(500).json({ error: notificationError.message });

  const readCountByCampaignId = new Map();
  for (const notificationRow of notificationRows || []) {
    const currentCount = readCountByCampaignId.get(notificationRow.event_name) || 0;
    if (notificationRow.metadata?.is_read === true) {
      readCountByCampaignId.set(notificationRow.event_name, currentCount + 1);
    }
  }

  const campaigns = (campaignRows || []).map((row) => {
    const campaignId = row.event_name || row.id;
    return {
      campaignId,
      title: row.payload?.title || row.metadata?.title || 'Message administrateur',
      message: row.payload?.message || '',
      segment: row.payload?.segment || 'ALL',
      sentAt: row.payload?.sentAt || row.created_at,
      recipientCount: Number(row.payload?.recipientCount || 0),
      readCount: readCountByCampaignId.get(campaignId) || 0,
    };
  });

  return res.json({ campaigns });
});

adminRouter.post('/messages/broadcast', async (req, res) => {
  const segment = normalizeAdminMessageSegment(req.body?.segment);
  const title = String(req.body?.title || '').trim();
  const message = String(req.body?.message || '').trim();

  if (!segment) return res.status(400).json({ error: 'invalid_segment' });
  if (!message) return res.status(400).json({ error: 'message_required' });

  const { profiles, error } = await getAdminAudienceProfiles(segment);
  if (error) return res.status(500).json({ error: error.message });

  const recipients = profiles || [];
  const sentAt = new Date().toISOString();
  const broadcastId = generateCheckoutReference('ADMIN');
  const notificationRows = recipients.map((profile) => ({
    user_id: profile.id,
    event_type: 'ADMIN_NOTIFICATION',
    event_name: broadcastId,
    metadata: buildAdminNotificationMetadata({
      campaignId: broadcastId,
      title,
      message,
      segment,
      sentAt,
    }),
    payload: {
      source: 'ADMIN_BROADCAST',
      campaignId: broadcastId,
    },
  }));

  if (notificationRows.length > 0) {
    const { error: insertNotificationsError } = await supabase.from('events').insert(notificationRows);
    if (insertNotificationsError) return res.status(500).json({ error: insertNotificationsError.message });
  }

  const { error: campaignInsertError } = await supabase.from('events').insert({
    user_id: req.user.id,
    event_type: 'ADMIN_BROADCAST',
    event_name: broadcastId,
    metadata: {
      title: title || null,
      source: 'ADMIN_BROADCAST',
    },
    payload: {
      segment,
      title: title || null,
      message,
      recipientCount: recipients.length,
      sentAt,
    },
  });

  if (campaignInsertError) return res.status(500).json({ error: campaignInsertError.message });

  await logAdminAction({
    adminId: req.user.id,
    action: 'SYSTEM_BROADCAST_SENT',
    targetId: null,
    targetType: 'broadcast',
    newData: {
      broadcast_id: broadcastId,
      segment,
      recipient_count: recipients.length,
      metadata: {
        title: title || null,
        sent_at: sentAt,
      },
    },
  });

  await Promise.allSettled(recipients.map((profile) => (
    sendPushToUser({
      userId: profile.id,
      title: title || 'Information Yamo',
      body: message,
      data: { type: 'SYSTEM', campaignId: broadcastId, segment },
    })
  )));

  return res.status(201).json({
    broadcastId,
    segment,
    recipientCount: recipients.length,
    sentAt,
  });
});

app.use('/api/admin', requireAuth, requireAdmin, adminRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Yamo server running on port ${PORT}`);
});
