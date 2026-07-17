const { TRIAL_DAYS } = require('../config/constants');

const isTrialActive = (p) => {
  if (!p || p.gender === 'FEMALE') return false;
  if (!p.trial_started_at) return false;
  const trialEnd = new Date(p.trial_started_at);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
  return new Date() < trialEnd;
};

const hasStandardAccess = (p) => {
  if (!p) return false;
  if (p.gender === 'FEMALE' || p.is_premium) return true;
  return true;
};

const hasInvisiblePremiumAccessForPlan = (profile, planId) => {
  const normalized = String(planId || '').toUpperCase();
  return normalized === 'MONTHLY' || normalized === 'QUARTERLY';
};

const isHiddenByInvisibleMode = (profile, hasInvisiblePremiumAccess = false) => {
  if (!profile || !profile.is_invisible) return false;
  const trialInvisibleCandidate =
    String(profile.gender || '').toUpperCase() === 'MALE' &&
    !profile.is_premium &&
    isTrialActive(profile);
  return trialInvisibleCandidate || hasInvisiblePremiumAccess;
};

const buildUserSegmentFilter = (segment) => {
  const value = String(segment || 'ALL').toUpperCase();
  return (profile) => {
    if (value === 'ALL') return true;
    if (value === 'ACTIVE') return !profile.suspended_at;
    if (value === 'UNVERIFIED') return !profile.is_verified;
    if (value === 'VERIFIED') return !!profile.is_verified;
    if (value === 'FREE') return !profile.is_premium;
    if (value === 'PREMIUM') return !!profile.is_premium;
    if (value === 'INVISIBLE_PREMIUM') return !!profile.is_premium && !!profile.is_invisible;
    if (value === 'SUSPENDED') return !!profile.suspended_at;
    return true;
  };
};

const appendAdminAuditLog = async ({
  adminId,
  action,
  targetUserId = null,
  metadata = {},
}) => {
  const { db } = require('../config/firebase');
  if (!adminId || !action) return;

  try {
    await db.collection('admin_audit_logs').add({
      admin_id: adminId,
      action,
      target_id: targetUserId,
      target_type: targetUserId ? 'USER' : null,
      new_data: metadata,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('admin_audit_log_insert_failed', error);
  }
};

const hasQuarterlyLimitedInvisibleAccess = (profile, planId) => {
  const normalized = String(planId || '').toUpperCase();
  return (
    normalized === 'QUARTERLY' &&
    !!profile?.is_premium &&
    !!profile?.is_invisible &&
    String(profile?.gender || '').toUpperCase() === 'MALE'
  );
};

module.exports = {
  isTrialActive,
  hasStandardAccess,
  hasInvisiblePremiumAccessForPlan,
  isHiddenByInvisibleMode,
  buildUserSegmentFilter,
  appendAdminAuditLog,
  hasQuarterlyLimitedInvisibleAccess
};
