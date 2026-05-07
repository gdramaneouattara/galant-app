import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('auth flow handles missing profile and suspended profile explicitly', async () => {
  const authFlow = await read('src/screens/auth/AuthFlowScreen.tsx');
  assert.match(authFlow, /profileError\.code\s*===\s*['"]PGRST116['"]/);
  assert.match(authFlow, /if\s*\(!profile\s*\|\|\s*!profile\.onboarding_completed\)/);
  assert.match(authFlow, /Compte suspendu/);
});

test('verify screen uses internal KYC submission flow', async () => {
  const verifyScreen = await read('src/screens/verify/VerifyScreen.tsx');
  assert.match(verifyScreen, /\/api\/kyc\/me/);
  assert.match(verifyScreen, /\/api\/kyc\/requests/);
  assert.match(verifyScreen, /uploadToSupabase/);
});

test('home screen uses backend matchmaking suggestions and swipe actions', async () => {
  const homeScreen = await read('src/screens/home/HomeScreen.tsx');
  assert.match(homeScreen, /\/api\/matchmaking\/suggestions/);
  assert.match(homeScreen, /\/api\/matchmaking\/swipe/);
});

test('premium and boost screens use backend monetization endpoints', async () => {
  const premiumScreen = await read('src/screens/premium/PremiumScreen.tsx');
  const likesReceivedScreen = await read('src/screens/premium/LikesReceivedScreen.tsx');

  assert.match(premiumScreen, /\/api\/payments\/initialize/);
  assert.match(premiumScreen, /\/api\/payments\/verify/);
  assert.match(likesReceivedScreen, /\/api\/super-likes\/received/);
  assert.match(likesReceivedScreen, /Boîte Super Likes/);
});

test('admin dashboard, messaging and navigator expose back-office workflows', async () => {
  const navigator = await read('src/navigation/MainNavigator.tsx');
  const dashboard = await read('src/screens/admin/AdminDashboardScreen.tsx');

  assert.match(navigator, /AdminDashboard/);
  assert.match(navigator, /AdminUserList/);
  assert.match(dashboard, /Espace d'administration/);
});
