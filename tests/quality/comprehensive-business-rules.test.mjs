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
    'web/src/pages/PartnerDiscoveryPage.tsx',
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
  assert.match(googleMapsService, /hotel/);
  assert.match(googleMapsService, /Promise\.allSettled/);
  assert.match(googleMapsService, /categoryErrors/);
  assert.match(googleMapsService, /ADMIN_SEEDER_CATEGORY_TYPES/);
  assert.match(googleMapsService, /maxWidthPx=1200/);
  assert.match(googleMapsService, /is_editorial:\s*true/);
  assert.match(googleMapsService, /status:\s*'APPROVED'/);
  assert.match(adminController, /seedVenuesFromGoogle/);
  assert.match(adminController, /ADMIN_SEEDER_CATEGORY_TYPES/);
  assert.match(adminController, /categories/);
  assert.match(adminController, /searchVenuesInCity\(city,\s*googleTypes\)/);
  assert.match(adminController, /candidateCount/);
  assert.match(adminController, /googleStatus/);
  assert.match(adminController, /details/);
  assert.match(adminRoutes, /\/venues\/seed/);
  assert.match(adminSeeder, /Peupler le Guide/);
  assert.match(adminSeeder, /SEEDER_CATEGORIES/);
  assert.match(adminSeeder, /selectedCategories/);
  assert.match(adminSeeder, /Spa & Beaute/);
  assert.match(adminSeeder, /Fleurs & Cadeaux/);
  assert.match(adminSeeder, /Culture & Loisirs/);
  assert.match(adminSeeder, /progress/);
  assert.match(adminLayout, /\/admin\/seeder/);
});

test('Rules: Apps exposes paid user partner discovery with direct Google import', async () => {
  const googleMapsService = await read('server/src/services/googleMapsService.js');
  const venueController = await read('server/src/controllers/venueController.js');
  const venueRoutes = await read('server/src/routes/venueRoutes.js');
  const constants = await read('server/src/config/constants.js');
  const paymentHelpers = await read('server/src/utils/paymentHelpers.js');
  const subscriptionService = await read('server/src/services/subscriptionService.js');
  const webApp = await read('web/src/App.tsx');
  const webApps = await read('web/src/pages/AppsPage.tsx');
  const webPartnerDiscovery = await read('web/src/pages/PartnerDiscoveryPage.tsx');
  const nativeApps = await read('src/screens/apps/AppsScreen.tsx');
  const nativePartnerDiscovery = await read('src/screens/apps/PartnerDiscoveryScreen.tsx');
  const nativeNavigator = await read('src/navigation/MainNavigator.tsx');
  const purchaseHook = await read('src/hooks/useSubscription.ts');

  assert.match(googleMapsService, /searchUserPartnerDiscovery/);
  assert.match(googleMapsService, /GOOGLE_PLACES_DIRECT/);
  assert.match(googleMapsService, /locationBias/);
  assert.match(googleMapsService, /USER_DISCOVERY_CATEGORY_TYPES/);
  assert.match(googleMapsService, /CAFE:\s*\['cafe'\]/);
  assert.match(googleMapsService, /BEAUTY:\s*\['spa',\s*'beauty_salon'\]/);
  assert.match(googleMapsService, /GIFTS:\s*\['florist',\s*'gift_shop'\]/);
  assert.match(googleMapsService, /CULTURE:\s*\['museum',\s*'art_gallery',\s*'movie_theater',\s*'park'\]/);
  assert.match(venueController, /discoverGooglePartners/);
  assert.match(venueController, /req\.query\.category/);
  assert.match(venueController, /partner_discovery_unlocked/);
  assert.match(venueController, /partner_discovery_requires_payment/);
  assert.match(venueRoutes, /\/partner-discovery\/google/);
  assert.match(venueRoutes, /\/partner-discovery\/access/);
  assert.match(constants, /PARTNER_DISCOVERY_UNLOCK:\s*parseInt\(process\.env\.PARTNER_DISCOVERY_UNLOCK_AMOUNT \|\| '500'\)/);
  assert.match(paymentHelpers, /PARTNER_DISCOVERY_UNLOCK/);
  assert.match(subscriptionService, /partner_discovery_unlocked:\s*true/);
  assert.match(webApp, /\/partner-discovery/);
  assert.match(webApps, /\/partner-discovery/);
  assert.doesNotMatch(webApps, /PARTNER_DISCOVERY_UNLOCK/);
  assert.doesNotMatch(webApps, /\/api\/venues\/partner-discovery\/google/);
  assert.match(webPartnerDiscovery, /PARTNER_DISCOVERY_UNLOCK/);
  assert.match(webPartnerDiscovery, /window\.confirm/);
  assert.match(webPartnerDiscovery, /\/api\/venues\/partner-discovery\/google/);
  assert.match(webPartnerDiscovery, /DISCOVERY_CATEGORIES/);
  assert.match(webPartnerDiscovery, /category/);
  assert.match(webPartnerDiscovery, /Spa & Beaute/);
  assert.match(webPartnerDiscovery, /Fleurs & Cadeaux/);
  assert.match(webPartnerDiscovery, /Culture & Loisirs/);
  assert.match(nativeNavigator, /PartnerDiscoveryScreen/);
  assert.match(nativeApps, /PartnerDiscovery/);
  assert.doesNotMatch(nativeApps, /PARTNER_DISCOVERY_UNLOCK/);
  assert.doesNotMatch(nativeApps, /\/api\/venues\/partner-discovery\/google/);
  assert.match(nativePartnerDiscovery, /PARTNER_DISCOVERY_UNLOCK/);
  assert.match(nativePartnerDiscovery, /Alert\.alert\(labels\.payTitle/);
  assert.match(nativePartnerDiscovery, /\/api\/venues\/partner-discovery\/google/);
  assert.match(nativePartnerDiscovery, /DISCOVERY_CATEGORIES/);
  assert.match(nativePartnerDiscovery, /CAFE/);
  assert.match(nativePartnerDiscovery, /BEAUTY/);
  assert.match(nativePartnerDiscovery, /GIFTS/);
  assert.match(nativePartnerDiscovery, /CULTURE/);
  assert.match(purchaseHook, /PARTNER_DISCOVERY_UNLOCK/);
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
