import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('auth flow handles missing profile and suspended profile explicitly', async () => {
  const authFlow = await read('src/screens/auth/AuthFlowScreen.tsx');
  assert.match(authFlow, /profileError\.code\s*===\s*['"]PGRST116['"]/);
  assert.match(authFlow, /goTo\(\s*['"]identity['"]\s*\)/);
  assert.match(authFlow, /if\s*\(\s*profile\.suspended_at\s*\)/);
  assert.match(authFlow, /Compte suspendu/);
});

test('api client defers missing EXPO_PUBLIC_API_BASE_URL check to request time', async () => {
  const api = await read('src/lib/api.ts');
  assert.match(api, /if\s*\(!runtimeApiBaseUrl\)/);
  assert.match(api, /EXPO_PUBLIC_API_BASE_URL is missing/);
});

test('api client safely handles non-json error payloads', async () => {
  const api = await read('src/lib/api.ts');
  assert.match(api, /try\s*\{\s*payload = JSON\.parse\(text\)/s);
  assert.match(api, /catch\s*\{\s*payload = \{\s*raw:\s*text\s*\}/s);
  assert.match(api, /payload\.raw\.slice\(0,\s*200\)/);
});

test('verify screen uses internal KYC submission flow', async () => {
  const verifyScreen = await read('src/screens/verify/VerifyScreen.tsx');
  assert.match(verifyScreen, /\/api\/kyc\/me/);
  assert.match(verifyScreen, /\/api\/kyc\/requests/);
  assert.match(verifyScreen, /supabase\.storage\.from\('kyc-docs'\)\.upload/);
  assert.match(verifyScreen, /launchCameraAsync/);
  assert.match(verifyScreen, /selfie_capture_mode:\s*'CAMERA'/);
});

test('auth flow enforces 3 to 6 profile photos before onboarding completion', async () => {
  const authFlow = await read('src/screens/auth/AuthFlowScreen.tsx');
  assert.match(authFlow, /form\.photos\.length\s*<\s*3/);
  assert.match(authFlow, /form\.photos\.length\s*>\s*6/);
  assert.match(authFlow, /Photos:\s*\{form\.photos\.length\}\/6/);
});

test('home screen uses backend matchmaking suggestions and swipe actions', async () => {
  const homeScreen = await read('src/screens/home/HomeScreen.tsx');
  assert.match(homeScreen, /\/api\/matchmaking\/suggestions/);
  assert.match(homeScreen, /\/api\/matchmaking\/swipe/);
  assert.match(homeScreen, /\/api\/matchmaking\/view-profile/);
  assert.match(homeScreen, /isSuperLike/);
  assert.match(homeScreen, /PanResponder\.create/);
});

test('chat screen uses backend message endpoint and moderation actions', async () => {
  const chatScreen = await read('src/screens/messages/ChatScreen.tsx');
  assert.match(chatScreen, /\/api\/messages\/send/);
  assert.match(chatScreen, /supabase\.storage\.from\('chat-media'\)\.upload/);
  assert.match(chatScreen, /\/api\/moderation\/report/);
  assert.match(chatScreen, /\/api\/moderation\/block/);
});

test('profile screen exposes GDPR request actions', async () => {
  const profileScreen = await read('src/screens/profile/ProfileScreen.tsx');
  assert.match(profileScreen, /\/api\/privacy\/request/);
  assert.match(profileScreen, /EXPORT/);
  assert.match(profileScreen, /DELETE/);
});

test('app context registers push tokens for authenticated users', async () => {
  const appContext = await read('src/state/AppContext.tsx');
  assert.match(appContext, /expo-notifications/);
  assert.match(appContext, /getExpoPushTokenAsync/);
  assert.match(appContext, /from\('push_tokens'\)\s*\.upsert/);
});
