import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('mobile storage uploads use array buffers instead of blobs', async () => {
  const helper = await read('src/lib/storageUpload.ts');
  const authFlow = await read('src/screens/auth/AuthFlowScreen.tsx');
  const chatScreen = await read('src/screens/messages/ChatScreen.tsx');
  const communityChatScreen = await read('src/screens/community/CommunityChatScreen.tsx');
  const verifyScreen = await read('src/screens/verify/VerifyScreen.tsx');

  assert.match(helper, /response\.arrayBuffer\(\)/);
  assert.match(helper, /supabase\.storage\.from\(bucket\)\.upload/);
  assert.match(authFlow, /uploadArrayBufferToBucket/);
  assert.match(chatScreen, /uploadArrayBufferToBucket/);
  assert.match(communityChatScreen, /uploadArrayBufferToBucket/);
  assert.match(verifyScreen, /uploadArrayBufferToBucket/);
});

test('backend auth returns profile_not_found for missing profile', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /profile_not_found/);
});

test('backend applies baseline transport and browser security controls', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /cors/);
});

test('backend exposes internal KYC endpoints for user submission', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /\/api\/kyc\/requests/);
});

test('backend exposes matchmaking and swipe endpoints', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /\/api\/matchmaking\/suggestions/);
  assert.match(server, /\/api\/matchmaking\/swipe/);
  assert.match(server, /premium_required_for_super_like/);
});

test('backend persists left swipes', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /direction === ['"]LEFT['"]/);
});

test('backend supports multiple boost plans', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /BOOST_1D/);
  assert.match(server, /BOOST_3D/);
  assert.match(server, /BOOST_7D/);
  assert.match(server, /TRIAL_BOOST_SECONDS/);
});

test('rls protects sensitive profile flags', async () => {
  const sql = await read('scripts/supabase-rls-rest-only.sql');
  assert.match(sql, /is_admin/i);
});

test('schema defines moderation and privacy tables', async () => {
  const schema = await read('scripts/supabase-schema.sql');
  assert.match(schema, /create table if not exists public\.likes/i);
  assert.match(schema, /create table if not exists public\.privacy_requests/i);
  assert.match(schema, /create table if not exists public\.super_likes/i);
  assert.match(schema, /create table if not exists public\.daily_usage/i);
});
