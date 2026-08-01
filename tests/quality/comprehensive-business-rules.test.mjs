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
  assert.match(code, /is_premium/);
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

test('Rules: Stories move into discovery and Apps replaces the stories tab', async () => {
  const homeScreen = await read('src/screens/home/HomeScreen.tsx');
  const navigator = await read('src/navigation/MainNavigator.tsx');
  const webApp = await read('web/src/App.tsx');
  const webDiscover = await read('web/src/pages/DiscoverPage.tsx');

  assert.match(homeScreen, /\/api\/statuses/);
  assert.match(homeScreen, /storyBubbles/);
  assert.match(navigator, /AppsTab/);
  assert.match(navigator, /AppsScreen/);
  assert.match(webApp, /\/apps/);
  assert.match(webDiscover, /\/api\/statuses/);
  assert.match(webDiscover, /initialStatusId/);
});

test('Rules: Sentinel fake call is wired on web and mobile', async () => {
  const nativeApps = await read('src/screens/apps/AppsScreen.tsx');
  const nativeNavigator = await read('src/navigation/MainNavigator.tsx');
  const nativeSentinel = await read('src/screens/apps/SentinelScreen.tsx');
  const webSentinel = await read('web/src/pages/SentinelPage.tsx');

  assert.match(nativeApps, /titleKey: 'sentinel'/);
  assert.match(nativeApps, /Sentinel/);
  assert.match(nativeNavigator, /SentinelScreen/);
  assert.match(nativeSentinel, /triggerFakeCall/);
  assert.match(nativeSentinel, /Vibration/);
  assert.match(nativeSentinel, /fake_call/);
  assert.match(webSentinel, /playRingtonePulse/);
  assert.match(webSentinel, /isFakeCallActive/);
});

test('Rules: Apps, Sentinel and Chat use shared bilingual copy', async () => {
  const files = [
    'src/screens/apps/AppsScreen.tsx',
    'src/screens/apps/SentinelScreen.tsx',
    'src/screens/messages/ChatScreen.tsx',
    'src/screens/messages/components/ChatMessageItem.tsx',
    'web/src/App.tsx',
    'web/src/pages/AppsPage.tsx',
    'web/src/pages/ChatPage.tsx',
    'web/src/pages/SentinelPage.tsx',
  ];
  const forbiddenCopies = [
    'La Sentinelle',
    'Appel fant',
    'Video trop',
    'Serenade trop',
    'Sérénade trop',
    'Micro requis',
    'Le partage de',
    'En ligne',
    'Hors ligne',
    'Refuser',
    'Accepter',
    'Raccrocher',
  ];

  for (const file of files) {
    const code = await read(file);
    for (const copy of forbiddenCopies) {
      assert.equal(code.includes(copy), false, `${file} still contains hardcoded copy: ${copy}`);
    }
  }
});

test('Rules: Admin Guide Seeder imports prestigious Google Places editorial venues', async () => {
  const googleMapsService = await read('server/src/services/googleMapsService.js');
  const adminController = await read('server/src/controllers/adminController.js');
  const adminRoutes = await read('server/src/routes/adminRoutes.js');
  const adminSeeder = await read('web/src/pages/admin/AdminGuideSeeder.tsx');
  const adminLayout = await read('web/src/pages/admin/AdminLayout.tsx');

  assert.match(googleMapsService, /places\.googleapis\.com\/v1\/places:searchText/);
  assert.match(googleMapsService, /includedType/);
  assert.match(googleMapsService, /strictTypeFiltering:\s*true/);
  assert.match(googleMapsService, /minRating:\s*MIN_PRESTIGE_RATING/);
  assert.match(googleMapsService, /Number\(place\.rating \|\| 0\) > MIN_PRESTIGE_RATING/);
  assert.match(googleMapsService, /restaurant/);
  assert.match(googleMapsService, /night_club/);
  assert.match(googleMapsService, /bar/);
  assert.match(googleMapsService, /lodging/);
  assert.match(googleMapsService, /maxWidthPx=1200/);
  assert.match(googleMapsService, /is_editorial:\s*true/);
  assert.match(googleMapsService, /status:\s*'APPROVED'/);
  assert.match(adminController, /seedVenuesFromGoogle/);
  assert.match(adminController, /candidateCount/);
  assert.match(adminRoutes, /\/venues\/seed/);
  assert.match(adminSeeder, /Peupler le Guide/);
  assert.match(adminSeeder, /progress/);
  assert.match(adminLayout, /\/admin\/seeder/);
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
