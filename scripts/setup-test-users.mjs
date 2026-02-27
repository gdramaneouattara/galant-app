import { createClient } from '@supabase/supabase-js';

const readEnv = (name) => {
  const raw = process.env[name];
  if (!raw) return undefined;
  // Guard against accidental multi-line paste from .env content.
  return raw.split(/\r?\n/)[0].trim();
};

const {
  ADMIN_TEST_PASSWORD,
  PREMIUM_TEST_PASSWORD,
  FREE_TEST_PASSWORD,
} = process.env;

const SUPABASE_URL = readEnv('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = readEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TEST_USERS = [
  {
    email: 'gdramane.ouattara@gmail.com',
    roleLabel: 'admin',
    isAdmin: true,
    isPremium: false,
    password: ADMIN_TEST_PASSWORD,
  },
  {
    email: 'utilisatrice1@gmail.com',
    roleLabel: 'premium',
    isAdmin: false,
    isPremium: true,
    password: PREMIUM_TEST_PASSWORD,
  },
  {
    email: 'dgouattara@gmail.com',
    roleLabel: 'free',
    isAdmin: false,
    isPremium: false,
    password: FREE_TEST_PASSWORD,
  },
];

async function listAllAuthUsers() {
  const users = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const batch = data?.users || [];
    users.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }

  return users;
}

async function run() {
  const authUsers = await listAllAuthUsers();
  const byEmail = new Map(authUsers.map((u) => [u.email?.toLowerCase(), u]));

  const failures = [];

  for (const target of TEST_USERS) {
    const authUser = byEmail.get(target.email.toLowerCase());
    if (!authUser) {
      failures.push(`User not found in auth.users: ${target.email}`);
      continue;
    }

    console.log(`\n[${target.roleLabel}] ${target.email}`);
    console.log(`UID: ${authUser.id}`);

    if (!target.password) {
      console.log('Password skipped (env var missing).');
    } else {
      const { error: passwordError } = await supabase.auth.admin.updateUserById(authUser.id, {
        password: target.password,
        email_confirm: true,
      });
      if (passwordError) {
        failures.push(`Password update failed for ${target.email}: ${passwordError.message}`);
      } else {
        console.log('Password updated.');
      }
    }

    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .update({
        is_admin: target.isAdmin,
        is_premium: target.isPremium,
        is_verified: true,
        is_invisible: false,
        suspended_at: null,
      })
      .eq('id', authUser.id)
      .select('id, is_admin, is_premium, is_verified, is_invisible, suspended_at')
      .single();

    if (profileError) {
      failures.push(`Profile update failed for ${target.email}: ${profileError.message}`);
    } else {
      console.log('Profile flags updated:', updatedProfile);
    }
  }

  if (failures.length > 0) {
    console.error('\nCompleted with errors:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('\nAll test users updated successfully.');
}

run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
