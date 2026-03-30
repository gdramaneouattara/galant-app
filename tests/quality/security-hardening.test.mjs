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
  assert.match(server, /\.\.\.\(invisibleModeAllowed\s*\?\s*\{\}\s*:\s*\{\s*is_invisible:\s*false\s*\}\)/);
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
});

test('backend exposes matchmaking, moderation and privacy admin endpoints', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /app\.get\(\s*['"]\/api\/matchmaking\/suggestions['"]/);
  assert.match(server, /app\.post\(\s*['"]\/api\/matchmaking\/swipe['"]/);
  assert.match(server, /app\.post\(\s*['"]\/api\/matchmaking\/view-profile['"]/);
  assert.match(server, /premium_required_for_super_like/);
  assert.match(server, /app\.post\(\s*['"]\/api\/messages\/send['"]/);
  assert.match(server, /app\.post\(\s*['"]\/api\/moderation\/report['"]/);
  assert.match(server, /app\.post\(\s*['"]\/api\/moderation\/block['"]/);
  assert.match(server, /adminRouter\.get\(\s*['"]\/reports['"]/);
  assert.match(server, /adminRouter\.post\(\s*['"]\/reports\/:id\/review['"]/);
  assert.match(server, /adminRouter\.get\(\s*['"]\/privacy-requests['"]/);
  assert.match(server, /adminRouter\.post\(\s*['"]\/privacy-requests\/:id\/resolve['"]/);
});

test('backend message moderation enforces content and media safeguards', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /MAX_TEXT_MESSAGE_LENGTH/);
  assert.match(server, /MAX_CHAT_MEDIA_BYTES/);
  assert.match(server, /detectTextModerationViolation/);
  assert.match(server, /detectImageModerationViolation/);
  assert.match(server, /content_inappropriate/);
});

test('schema defines moderation and privacy tables for internal governance', async () => {
  const schema = await read('scripts/supabase-schema.sql');
  assert.match(schema, /create table if not exists public\.likes/i);
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
  test(`${file} has hardened message update controls`, async () => {
    const sql = await read(file);
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.prevent_unsafe_message_updates/i);
    assert.match(sql, /CREATE TRIGGER prevent_unsafe_message_updates/i);
    assert.match(sql, /Not allowed to edit another user message/i);
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
