const hasAdminAccess = (profile) => {
  if (profile?.is_admin === true) return true;
  return String(profile?.is_admin || '').toLowerCase() === 'true';
};

module.exports = { hasAdminAccess };
