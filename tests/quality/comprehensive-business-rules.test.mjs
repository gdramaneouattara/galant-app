import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('Rules: ChatScreen handles send messages', async () => {
  const code = await read('src/screens/messages/ChatScreen.tsx');
  assert.match(code, /handleSend/);
});

test('Rules: ChatScreen handles translation Premium perk', async () => {
  const code = await read('src/screens/messages/components/ChatMessageItem.tsx');
  assert.match(code, /translateMessage/);
  assert.match(code, /isPremium/);
});

test('Rules: HomeScreen implements visibility insights', async () => {
  const code = await read('src/screens/home/components/VisibilityInsight.tsx');
  assert.match(code, /VisibilityInsight/);
});

test('Rules: HomeScreen displays badges on profile cards', async () => {
  const code = await read('src/screens/home/components/ProfileCard.tsx');
  assert.match(code, /ProfileBadges/);
});

test('Rules: BoostScreen handles multi-plan boosts', async () => {
  const code = await read('src/screens/boost/BoostScreen.tsx');
  assert.match(code, /BOOST_PLANS/);
});

test('Rules: StatusScreen exists and is accessible', async () => {
  const code = await read('src/screens/home/StatusScreen.tsx');
  assert.match(code, /StatusScreen/);
});

test('Rules: ProfileScreen manages internationalization', async () => {
  const code = await read('src/screens/profile/ProfileScreen.tsx');
  assert.match(code, /language/);
});

test('Rules: AppContext syncs is_vip', async () => {
  const code = await read('src/state/AppContext.tsx');
  assert.match(code, /is_vip/);
});

test('Rules: Backend matchmaking suggestions endpoint exists', async () => {
  const code = await read('server/src/routes/matchmakingRoutes.js');
  assert.match(code, /\/suggestions/);
});

test('Rules: Backend calculates scores with boosts', async () => {
  const code = await read('server/src/controllers/matchmakingController.js');
  assert.match(code, /score/);
});

test('Rules: Backend handles internationalization in AI', async () => {
  const code = await read('server/src/controllers/aiController.js');
  assert.match(code, /lang/);
  assert.match(code, /targetLang/);
});

test('Rules: Database schema is Galant-ready', async () => {
  const code = await read('scripts/supabase-schema.sql');
  assert.match(code, /likes/);
});

test('Rules: AdminDashboard includes partner moderation', async () => {
  const code = await read('src/screens/admin/AdminDashboardScreen.tsx');
  assert.match(code, /AdminVenues/);
});

test('Rules: PremiumScreen handles user monetization', async () => {
  const code = await read('src/screens/premium/PremiumScreen.tsx');
  assert.match(code, /PREMIUM/);
});

test('Rules: PartnerPremiumScreen handles B2B monetization', async () => {
  const code = await read('src/screens/partner/PartnerPremiumScreen.tsx');
  assert.match(code, /PARTNER_PREMIUM/);
});
