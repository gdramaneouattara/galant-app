const FALLBACK_ADMIN_PROFILE_IDS = new Set([
  'SxD1Qlh3Nph2CBK2qcV6CY1uzht1',
]);

export const hasAdminProfileAccess = (profile: any, uid?: string | null) => {
  return profile?.is_admin === true || (!!uid && FALLBACK_ADMIN_PROFILE_IDS.has(uid));
};
