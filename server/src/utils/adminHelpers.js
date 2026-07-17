const normalizePrivacyStatusForClient = (value) => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'PENDING') return 'OPEN';
  if (normalized === 'PROCESSING') return 'IN_PROGRESS';
  if (normalized === 'COMPLETED') return 'RESOLVED';
  if (normalized === 'FAILED') return 'REJECTED';
  return normalized || 'OPEN';
};

const normalizePrivacyStatusForDb = (value) => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'OPEN') return 'PENDING';
  if (normalized === 'IN_PROGRESS') return 'PROCESSING';
  if (normalized === 'RESOLVED') return 'COMPLETED';
  if (normalized === 'REJECTED') return 'FAILED';
  return null;
};

const normalizeReportStatusForClient = (value) => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'PENDING') return 'OPEN';
  if (normalized === 'INVESTIGATING') return 'IN_REVIEW';
  return normalized || 'OPEN';
};

const normalizeReportStatusForDb = (value) => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'OPEN') return 'PENDING';
  if (normalized === 'IN_REVIEW') return 'INVESTIGATING';
  return normalized || 'PENDING';
};

module.exports = {
  normalizePrivacyStatusForClient,
  normalizePrivacyStatusForDb,
  normalizeReportStatusForClient,
  normalizeReportStatusForDb
};
