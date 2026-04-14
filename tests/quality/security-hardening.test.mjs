import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('backend auth returns profile_not_found for missing profile (PGRST116)', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /profileError\.code\s*===\s*['"]PGRST116['"]/);
  assert.match(server, /status\(403\)\.json\(\{\s*error:\s*['"]profile_not_found['"]\s*\}\)/);
});

test('backend applies baseline transport and browser security controls', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /Strict-Transport-Security/);
  assert.match(server, /X-Content-Type-Options/);
  assert.match(server, /cors_origin_not_allowed/);
});

test('backend keeps invisible mode restricted to eligible plans', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /INVISIBLE_MODE_PLAN_KEYS\s*=\s*\[\s*['"]BIANNUAL['"]\s*,\s*['"]ANNUAL['"]\s*\]/);
  assert.match(server, /getInvisibleModeEligibleUserIds/);
  assert.match(server, /shouldHideProfileFromMatchmaking/);
  assert.match(server, /\.\.\.\(invisibleModeAllowed\s*\?\s*\{\}\s*:\s*\{\s*is_invisible:\s*false\s*\}\)/);
  assert.doesNotMatch(server, /\.eq\('is_invisible', false\)/);
});

test('backend exposes admin suspend endpoint and updates suspended_at', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /adminRouter\.put\(\s*['"]\/users\/:id\/suspend['"]/);
  assert.match(server, /\.update\(\{\s*suspended_at\s*\}\)/);
});

test('backend exposes internal KYC endpoints for user submission and admin review', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /app\.get\(\s*['"]\/api\/kyc\/me['"]/);
  assert.match(server, /app\.post\(\s*['"]\/api\/kyc\/requests['"]/);
  assert.match(server, /adminRouter\.get\(\s*['"]\/kyc\/requests['"]/);
  assert.match(server, /adminRouter\.post\(\s*['"]\/kyc\/requests\/:id\/review['"]/);
  assert.match(server, /const documentBackPath = String\(req\.body\?\.document_back_path \|\| ''\)\.trim\(\)/);
  assert.match(server, /const requiresBackDocument = normalizedDocumentType === 'ID_CARD' \|\| normalizedDocumentType === 'DRIVERS_LICENSE'/);
  assert.match(server, /document_back_url:\s*documentBackPath \|\| null/);
  assert.match(server, /document_back_url:\s*await createSignedStorageUrl\('kyc-docs', request\.document_back_url\)/);
  assert.match(server, /selfie_live_capture_required/);
  assert.match(server, /kyc_request_already_open/);
});

test('backend exposes matchmaking, moderation and privacy admin endpoints', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /app\.get\(\s*['"]\/api\/matchmaking\/suggestions['"]/);
  assert.match(server, /app\.post\(\s*['"]\/api\/matchmaking\/swipe['"]/);
  assert.match(server, /app\.post\(\s*['"]\/api\/matchmaking\/view-profile['"]/);
  assert.match(server, /\.eq\('photo_review_status', 'APPROVED'\)/);
  assert.match(server, /photo_review_status !== 'APPROVED'/);
  assert.match(server, /premium_required_for_super_like/);
  assert.match(server, /app\.post\(\s*['"]\/api\/messages\/send['"]/);
  assert.match(server, /app\.post\(\s*['"]\/api\/moderation\/report['"]/);
  assert.match(server, /app\.post\(\s*['"]\/api\/moderation\/block['"]/);
  assert.match(server, /app\.post\(\s*['"]\/api\/moderation\/photos\/check['"]/);
  assert.match(server, /app\.post\(\s*['"]\/api\/privacy\/request['"]/);
  assert.match(server, /app\.get\(\s*['"]\/api\/privacy\/export['"]/);
  assert.match(server, /app\.post\(\s*['"]\/api\/account\/delete['"]/);
  assert.match(server, /adminRouter\.get\(\s*['"]\/reports['"]/);
  assert.match(server, /adminRouter\.post\(\s*['"]\/reports\/:id\/review['"]/);
  assert.match(server, /adminRouter\.get\(\s*['"]\/privacy-requests['"]/);
  assert.match(server, /adminRouter\.post\(\s*['"]\/privacy-requests\/:id\/resolve['"]/);
  assert.match(server, /adminRouter\.get\(\s*['"]\/photo-reviews['"]/);
  assert.match(server, /adminRouter\.post\(\s*['"]\/photo-reviews\/:id\/review['"]/);
  assert.match(server, /adminRouter\.get\(\s*['"]\/stats['"]/);
});

test('backend persists left swipes and excludes prior swipe history from suggestions', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /getExcludedMatchmakingUserIds/);
  assert.match(server, /from\('passes'\)\.select\('passed_user_id'\)\.eq\('passer_id', userId\)/);
  assert.match(server, /from\('matches'\)\.select\('user_one_id, user_two_id'\)/);
  assert.match(server, /excludedUserIds\.has\(candidate\.id\)/);
  assert.match(server, /invalid_swipe_direction/);
  assert.match(server, /from\('passes'\)\.upsert/);
  assert.match(server, /event_name:\s*'pass_sent'/);
  assert.match(server, /passed:\s*true/);
});

test('backend super like flow enforces target validation and dedicated notification', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /invalid_swipe_target/);
  assert.match(server, /profile_not_found/);
  assert.match(server, /event_name:\s*isSuperLike \? 'super_like_sent' : 'like_sent'/);
  assert.match(server, /title:\s*'Super Like recu'/);
  assert.match(server, /type:\s*'SUPER_LIKE'/);
  assert.match(server, /superLiked:\s*!!isSuperLike/);
});

test('backend exposes community creation, membership and role management endpoints', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /app\.post\(\s*['"]\/api\/communities\/create['"]/);
  assert.match(server, /app\.get\(\s*['"]\/api\/communities\/:id\/members['"]/);
  assert.match(server, /app\.patch\(\s*['"]\/api\/communities\/:id\/members\/:userId\/role['"]/);
  assert.match(server, /app\.delete\(\s*['"]\/api\/communities\/:id\/members\/:userId['"]/);
  assert.match(server, /COMMUNITY_ROLES\s*=\s*\[\s*['"]MEMBER['"]\s*,\s*['"]MODERATOR['"]\s*,\s*['"]ADMIN['"]\s*\]/);
  assert.match(server, /community_admin_required/);
  assert.match(server, /last_admin_required/);
});

test('backend exposes premium monetization endpoints and plan gating', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /PREMIUM_PLAN_DURATIONS_DAYS/);
  assert.match(server, /BOOST_PLAN_DURATIONS_MS/);
  assert.match(server, /app\.post\(\s*['"]\/api\/payments\/initialize['"]/);
  assert.match(server, /app\.get\(\s*['"]\/api\/payments\/verify['"]/);
  assert.match(server, /app\.post\(\s*['"]\/api\/boosts\/initialize['"]/);
  assert.match(server, /app\.get\(\s*['"]\/api\/boosts\/verify['"]/);
  assert.match(server, /app\.get\(\s*['"]\/api\/likes\/quota['"]/);
  assert.match(server, /app\.get\(\s*['"]\/api\/premium\/likes-received['"]/);
  assert.match(server, /community_creation_plan_required/);
  assert.match(server, /daily_like_limit_reached/);
  assert.match(server, /resolveRequestTimeZone/);
  assert.match(server, /getLikeQuotaWindow/);
  assert.match(server, /timeZone: requestTimeZone/);
  assert.match(server, /\.lt\('created_at', resetAt\.toISOString\(\)\)/);
});

test('backend exposes admin back-office user, audit and notification endpoints', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /adminRouter\.get\(\s*['"]\/users['"]/);
  assert.match(server, /adminRouter\.delete\(\s*['"]\/users\/:id['"]/);
  assert.match(server, /adminRouter\.post\(\s*['"]\/users\/reconcile-profiles['"]/);
  assert.match(server, /adminRouter\.get\(\s*['"]\/audit-logs['"]/);
  assert.match(server, /adminRouter\.get\(\s*['"]\/messages\/audience['"]/);
  assert.match(server, /adminRouter\.get\(\s*['"]\/messages\/history['"]/);
  assert.match(server, /adminRouter\.post\(\s*['"]\/messages\/broadcast['"]/);
  assert.match(server, /app\.get\(\s*['"]\/api\/notifications\/admin['"]/);
  assert.match(server, /app\.post\(\s*['"]\/api\/notifications\/admin\/:id\/read['"]/);
  assert.match(server, /app\.post\(\s*['"]\/api\/notifications\/admin\/read-all['"]/);
  assert.match(server, /event_type:\s*'ADMIN_NOTIFICATION'/);
  assert.match(server, /event_type:\s*'ADMIN_BROADCAST'/);
  assert.match(server, /USER_DELETE_ADMIN/);
  assert.match(server, /SYSTEM_BROADCAST_SENT/);
});

test('backend community chat enforces membership and premium media controls', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /app\.post\(\s*['"]\/api\/communities\/:id\/messages['"]/);
  assert.match(server, /app\.get\(\s*['"]\/api\/communities\/:id\/messages['"]/);
  assert.match(server, /if\s*\(!membership\)\s*return res\.status\(403\)\.json\(\{\s*error:\s*['"]not_a_member['"]\s*\}\)/);
  assert.match(server, /if\s*\(!req\.user\.isPremium\)\s*return res\.status\(403\)\.json\(\{\s*error:\s*['"]premium_required['"]\s*\}\)/);
  assert.match(server, /detectVideoModerationViolation/);
});

test('backend message moderation enforces content and media safeguards', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /MAX_TEXT_MESSAGE_LENGTH/);
  assert.match(server, /MAX_CHAT_MEDIA_BYTES/);
  assert.match(server, /app\.post\(\s*['"]\/api\/messages\/read['"]/);
  assert.match(server, /detectTextModerationViolation/);
  assert.match(server, /detectImageModerationViolation/);
  assert.match(server, /if \(normalizedType === 'IMAGE'\) \{/);
  assert.match(server, /if \(normalizedType === 'VIDEO'\) \{/);
  assert.match(server, /if \(!req\.user\.isPremium\) return res\.status\(403\)\.json\(\{\s*error:\s*'premium_required'\s*\}\);/);
  assert.match(server, /content_inappropriate/);
});

test('rls protects sensitive profile flags from regular users', async () => {
  const sql = await read('scripts/supabase-rls.sql');
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.prevent_sensitive_profile_updates/i);
  assert.match(sql, /new\.is_verified IS DISTINCT FROM old\.is_verified/i);
  assert.match(sql, /new\.is_admin IS DISTINCT FROM old\.is_admin/i);
  assert.match(sql, /new\.photo_review_status IS DISTINCT FROM old\.photo_review_status/i);
});

test('schema defines moderation and privacy tables for internal governance', async () => {
  const schema = await read('scripts/supabase-schema.sql');
  assert.match(schema, /create table if not exists public\.likes/i);
  assert.match(schema, /create table if not exists public\.passes/i);
  assert.match(schema, /create table if not exists public\.blocks/i);
  assert.match(schema, /create table if not exists public\.reports/i);
  assert.match(schema, /create table if not exists public\.privacy_requests/i);
  assert.match(schema, /create table if not exists public\.push_tokens/i);
  assert.match(schema, /validate_profile_photos_count/i);
});

test('schema defines KYC verification table with one open request per user', async () => {
  const schema = await read('scripts/supabase-schema.sql');
  assert.match(schema, /create table if not exists public\.kyc_verifications/i);
  assert.match(schema, /create unique index if not exists kyc_verifications_one_open_request_per_user_idx/i);
  assert.match(schema, /normalize_kyc_verification/i);
});

for (const file of ['scripts/supabase-rls.sql', 'scripts/supabase-rls-rest-only.sql']) {
  test(`${file} includes pass table policies`, async () => {
    const sql = await read(file);
    assert.match(sql, /ALTER TABLE IF EXISTS public\.passes ENABLE ROW LEVEL SECURITY/i);
    assert.match(sql, /Users can create their passes\./i);
    assert.match(sql, /Users can delete their passes\./i);
  });

  test(`${file} has hardened message update controls`, async () => {
    const sql = await read(file);
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.prevent_unsafe_message_updates/i);
    assert.match(sql, /CREATE TRIGGER prevent_unsafe_message_updates/i);
    assert.match(sql, /Not allowed to edit another user message/i);
    assert.match(sql, /upper\(coalesce\(message_type, 'TEXT'\)\) in \('TEXT', 'IMAGE', 'VIDEO'\)/i);
    assert.match(sql, /CREATE POLICY "Users can update their messages\."[\s\S]*or is_read = true/i);
  });

  test(`${file} normalizes match pairs and blocks self-matches`, async () => {
    const sql = await read(file);
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.normalize_match_pair/i);
    assert.match(sql, /A match requires two distinct users/i);
    assert.match(sql, /CREATE TRIGGER normalize_match_pair/i);
  });

  test(`${file} includes KYC table policies`, async () => {
    const sql = await read(file);
    assert.match(sql, /ALTER TABLE IF EXISTS public\.kyc_verifications ENABLE ROW LEVEL SECURITY/i);
    assert.match(sql, /Users can view their own KYC requests\./i);
    assert.match(sql, /Admins can review KYC requests\./i);
  });
}

test('storage-only RLS includes KYC document bucket protections', async () => {
  const sql = await read('scripts/supabase-rls-storage-only.sql');
  assert.match(sql, /bucket_id = 'kyc-docs'/i);
  assert.match(sql, /Users can upload to their own KYC folder\./i);
  assert.match(sql, /Users can view their own KYC files\./i);
});

test('storage-only RLS includes chat media bucket protections', async () => {
  const sql = await read('scripts/supabase-rls-storage-only.sql');
  assert.match(sql, /bucket_id = 'chat-media'/i);
  assert.match(sql, /Users can upload chat media to their own folder\./i);
  assert.match(sql, /Users can delete their own chat media\./i);
  assert.match(sql, /from public\.matches m/i);
});

test('storage-only RLS restricts community media reads to community members', async () => {
  const sql = await read('scripts/supabase-rls-storage-only.sql');
  assert.match(sql, /bucket_id = 'community-media'/i);
  assert.match(sql, /Members can view community media\./i);
  assert.match(sql, /from public\.community_members cm/i);
});
