import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cache = new Map();
const read = async (path) => {
  if (!cache.has(path)) {
    cache.set(path, await readFile(path, 'utf8'));
  }
  return cache.get(path);
};

const backendChecks = [
  "app.get('/api/likes/quota'",
  "app.post('/api/messages/send'",
  "app.post('/api/messages/mark-read'",
  "app.get('/api/super-likes/received'",
  "app.post('/api/super-likes/:id/respond'",
  "app.get('/api/privacy/export'",
  "app.get('/api/notifications/admin'",
  "app.post('/api/notifications/admin/:id/read'",
  "app.post('/api/notifications/admin/read-all'",
  "app.get('/api/communities'",
  "app.post('/api/communities/create'",
  "app.post('/api/communities/:communityId/join'",
  "app.get('/api/communities/:communityId/messages'",
  "app.post('/api/communities/:communityId/messages'",
  "app.get('/api/communities/:communityId/members'",
  "app.patch('/api/communities/:communityId/members/:userId/role'",
  "app.delete('/api/communities/:communityId/members/:userId'",
  "adminRouter.get('/audit-logs'",
  "adminRouter.get('/messages/history'",
  'premium_required_for_super_like',
  'community_schema_missing',
  'appendAdminAuditLog',
  'message_type: normalizedType',
  'media_url: mediaPath || null',
];

backendChecks.forEach((snippet, index) => {
  test(`Backend alignment check #${index + 1}`, async () => {
    const server = await read('server/src/index.js');
    assert.ok(
      server.includes(snippet),
      `Missing backend snippet: ${snippet}`
    );
  });
});

const mobileChecks = [
  { file: 'src/screens/home/HomeScreen.tsx', snippet: '/api/matchmaking/suggestions' },
  { file: 'src/screens/home/HomeScreen.tsx', snippet: '/api/matchmaking/swipe' },
  { file: 'src/screens/messages/ChatScreen.tsx', snippet: '/api/messages/send' },
  { file: 'src/screens/messages/MessagesScreen.tsx', snippet: '/api/notifications/admin' },
  { file: 'src/screens/community/CommunityScreen.tsx', snippet: '/api/communities' },
  { file: 'src/screens/community/CommunityScreen.tsx', snippet: '/api/communities/create' },
  { file: 'src/screens/community/CommunityChatScreen.tsx', snippet: '/api/communities/${communityId}/messages' },
  { file: 'src/screens/profile/ProfileScreen.tsx', snippet: '/api/privacy/export' },
  { file: 'src/screens/verify/VerifyScreen.tsx', snippet: '/api/kyc/me' },
  { file: 'src/screens/verify/VerifyScreen.tsx', snippet: '/api/kyc/requests' },
  { file: 'src/state/AppContext.tsx', snippet: '/api/profile/boost' },
  { file: 'src/state/AppContext.tsx', snippet: '/api/messages/mark-read' },
  { file: 'src/lib/api.ts', snippet: 'EXPO_PUBLIC_API_BASE_URL is missing.' },
  { file: 'src/lib/api.ts', snippet: "headers.set('Authorization', `Bearer ${token}`)" },
];

mobileChecks.forEach(({ file, snippet }, index) => {
  test(`Mobile alignment check #${index + 1}`, async () => {
    const code = await read(file);
    assert.ok(code.includes(snippet), `Missing mobile snippet in ${file}: ${snippet}`);
  });
});

const schemaChecks = [
  'create table if not exists public.communities',
  'create table if not exists public.community_members',
  'create table if not exists public.community_messages',
  'create table if not exists public.super_likes',
  'create table if not exists public.privacy_requests',
  'create table if not exists public.likes',
  'create table if not exists public.daily_usage',
  "check (status in ('PENDING', 'ACCEPTED', 'IGNORED'))",
];

schemaChecks.forEach((snippet, index) => {
  test(`Schema alignment check #${index + 1}`, async () => {
    const schema = await read('scripts/supabase-schema.sql');
    assert.ok(schema.includes(snippet), `Missing schema snippet: ${snippet}`);
  });
});
