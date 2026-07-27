const isTruthyAdminValue = (value) => value === true || String(value || '').toLowerCase() === 'true';

const normalizeAdminKey = (key) => String(key || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

const hasAdminAccess = (profile) => {
  if (!profile) return false;
  if (isTruthyAdminValue(profile.is_admin)) return true;

  return Object.entries(profile).some(([key, value]) => (
    normalizeAdminKey(key) === 'isadmin' && isTruthyAdminValue(value)
  ));
};

module.exports = { hasAdminAccess };
