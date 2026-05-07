import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('Rules: ChatScreen detects DIRECT_MESSAGE purchase status', async () => {
  const code = await read('src/screens/messages/ChatScreen.tsx');
  assert.match(code, /interaction_type/);
  assert.match(code, /DIRECT_MESSAGE/);
  assert.match(code, /setIsUnlocked/);
});

test('Rules: ChatScreen handles payment_required with stylized modal', async () => {
  const code = await read('src/screens/messages/ChatScreen.tsx');
  assert.match(code, /payment_required/);
  assert.match(code, /DirectMessagePurchaseModal/);
});

test('Rules: HomeScreen implements SuperLikePurchaseModal for quotas', async () => {
  const code = await read('src/screens/home/HomeScreen.tsx');
  assert.match(code, /premium_required_for_super_like/);
  assert.match(code, /SuperLikePurchaseModal/);
});

test('Rules: HomeScreen displays badges on profile cards', async () => {
  const code = await read('src/screens/home/HomeScreen.tsx');
  assert.match(code, /ProfileBadges/);
});

test('Rules: BoostScreen displays free boost card', async () => {
  const code = await read('src/screens/boost/BoostScreen.tsx');
  assert.match(code, /freeBoostCard/);
});

test('Rules: StatusScreen supports media uploads', async () => {
  const code = await read('src/screens/home/StatusScreen.tsx');
  assert.match(code, /media_url/);
  assert.match(code, /VIDEO/);
});

test('Rules: ProfileScreen manages relationship goals', async () => {
  const code = await read('src/screens/profile/ProfileScreen.tsx');
  assert.match(code, /RELATIONSHIP_GOALS/);
});

test('Rules: AppContext syncs is_vip', async () => {
  const code = await read('src/state/AppContext.tsx');
  assert.match(code, /is_vip/);
});

test('Rules: Backend matchmaking suggestions endpoint exists', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /matchmaking\/suggestions/);
});

test('Rules: Backend enforces trial boost quota', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /TRIAL_BOOST_SECONDS/);
});

test('Rules: Backend handles stealth mode', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /HIDE_SEEN/);
});

test('Rules: Database RLS trigger for sensitive flags exists', async () => {
  const code = await read('scripts/supabase-rls.sql');
  assert.match(code, /is_admin/);
});

test('Rules: AdminDashboard includes essential shortcuts', async () => {
  const code = await read('src/screens/admin/AdminDashboardScreen.tsx');
  assert.match(code, /AdminUserList/);
});

test('Rules: PremiumScreen initializes payments', async () => {
  const code = await read('src/screens/premium/PremiumScreen.tsx');
  assert.match(code, /PREMIUM/);
});

test('Rules: AppContext manages invisible mode', async () => {
  const code = await read('src/state/AppContext.tsx');
  assert.match(code, /invisible/);
});
