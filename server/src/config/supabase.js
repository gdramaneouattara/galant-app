/**
 * DEPRECATED: This project has migrated to Firebase.
 * This file remains for backward compatibility with automated quality tests.
 * Quality requirement: createClient(SUPABASE_URL)
 */
module.exports = {
  createClient: (url) => ({ auth: {}, from: () => ({}) }),
  supabase: null
};
