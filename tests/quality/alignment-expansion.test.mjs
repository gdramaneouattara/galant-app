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
  { file: 'server/src/index.js', snippet: "app.use('/api/ai', aiRoutes)" },
  { file: 'server/src/index.js', snippet: "app.use('/api/messages', messageRoutes)" },
  { file: 'server/src/index.js', snippet: "app.use('/api/matchmaking', matchmakingRoutes)" },
  { file: 'server/src/index.js', snippet: "app.use('/api/payments', paymentRoutes)" },
  { file: 'server/src/index.js', snippet: "app.use('/api/admin', adminRoutes)" },
  { file: 'server/src/config/supabase.js', snippet: "createClient(SUPABASE_URL" },
  { file: 'server/src/middleware/auth.js', snippet: "requireAuth" },
  { file: 'server/src/controllers/matchmakingController.js', snippet: "getSuggestions" },
  { file: 'server/src/controllers/aiController.js', snippet: "targetLang" },
  { file: 'server/src/controllers/messageController.js', snippet: "sendMessage" },
  { file: 'server/src/config/constants.js', snippet: "PARTNER_VISIBILITY_AMOUNT" },
];

backendChecks.forEach(({ file, snippet }, index) => {
  test(`Backend alignment check #${index + 1}`, async () => {
    const code = await read(file);
    assert.ok(
      code.includes(snippet),
      `Missing snippet in ${file}: ${snippet}`
    );
  });
});

const mobileChecks = [
  { file: 'src/screens/home/HomeScreen.tsx', snippet: '/api/matchmaking/suggestions' },
  { file: 'src/screens/home/HomeScreen.tsx', snippet: '/api/matchmaking/visibility-insight' },
  { file: 'src/screens/messages/ChatScreen.tsx', snippet: '/api/messages/send' },
  { file: 'src/screens/messages/components/ChatMessageItem.tsx', snippet: '/api/ai/translate' },
  { file: 'src/screens/messages/MessagesScreen.tsx', snippet: '/api/notifications/admin' },
  { file: 'src/screens/profile/ProfileScreen.tsx', snippet: '/api/privacy/export' },
  { file: 'src/screens/verify/VerifyScreen.tsx', snippet: '/api/kyc/requests' },
  { file: 'src/components/passport/PassportModal.tsx', snippet: 'passport_city' },
  { file: 'src/screens/partner/PartnerPremiumScreen.tsx', snippet: 'PARTNER_PREMIUM' },
  { file: 'src/translations/index.ts', snippet: 'rose_box' },
  { file: 'src/lib/api.ts', snippet: 'EXPO_PUBLIC_API_BASE_URL' },
];

mobileChecks.forEach(({ file, snippet }, index) => {
  test(`Mobile alignment check #${index + 1}`, async () => {
    const code = await read(file);
    assert.ok(code.includes(snippet), `Missing mobile snippet in ${file}: ${snippet}`);
  });
});

const schemaChecks = [
  'create table if not exists public.super_likes',
  'create table if not exists public.privacy_requests',
  'create table if not exists public.likes',
  'create table if not exists public.daily_usage',
  'create table if not exists public.venues',
  'create table if not exists public.subscriptions',
  "check (status in ('PENDING', 'ACCEPTED', 'IGNORED'))",
];

schemaChecks.forEach((snippet, index) => {
  test(`Schema alignment check #${index + 1}`, async () => {
    const schema = await read('scripts/supabase-schema.sql');
    assert.ok(schema.includes(snippet), `Missing schema snippet: ${snippet}`);
  });
});
