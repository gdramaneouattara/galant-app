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
  assert.match(code, /storyUploadUnlocked \|\| await refreshStoryUploadAccess\(\)/);
  assert.match(code, /locked\s*\?\s*await refreshStoryUploadAccess\(\{ forceServer: true \}\)/);
  assert.match(code, /!forceServer && \(currentUser\.is_premium \|\| currentUser\.is_vip\)/);
  assert.doesNotMatch(code, /const canPublish = !locked/);
});

test('Rules: Auth forms keep Galant logo visible after login or signup choice', async () => {
  const webAuth = await read('web/src/pages/AuthPage.tsx');
  const nativeAuthMethod = await read('src/screens/auth/components/AuthMethodStep.tsx');

  assert.match(webAuth, /galant-logo-web\.png/);
  assert.match(webAuth, /alt="Galant Logo"/);
  assert.match(nativeAuthMethod, /assets\/icon \(2\)\.png/);
  assert.match(nativeAuthMethod, /brandHeader/);
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
  assert.match(webSentinel, /const \{[^}]*t[^}]*\} = useAuth\(\)/s);
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
  assert.match(googleMapsService, /GOOGLE_PHOTO_WIDTHS/);
  assert.match(googleMapsService, /google_photo_name/);
  assert.match(googleMapsService, /google_photo_attributions/);
  assert.match(googleMapsService, /image_source:\s*photo \? 'google_places'/);
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

test('Rules: Guide Google photos are referenced, sized and attributed without Storage backfill', async () => {
  const googleMapsService = await read('server/src/services/googleMapsService.js');
  const venueController = await read('server/src/controllers/venueController.js');
  const venueRoutes = await read('server/src/routes/venueRoutes.js');
  const webGuide = await read('web/src/pages/GuidePage.tsx');
  const webVenueDetail = await read('web/src/pages/VenueDetailPage.tsx');
  const nativeGuide = await read('src/screens/guide/GuideScreen.tsx');
  const nativeVenueDetail = await read('src/screens/guide/VenueDetailScreen.tsx');

  assert.match(googleMapsService, /GOOGLE_PHOTO_WIDTHS/);
  assert.match(googleMapsService, /thumb:\s*320/);
  assert.match(googleMapsService, /medium:\s*800/);
  assert.match(googleMapsService, /full:\s*1200/);
  assert.match(googleMapsService, /extractGooglePhotoNameFromUrl/);
  assert.match(googleMapsService, /photo_url:\s*photo \? null/);
  assert.doesNotMatch(googleMapsService, /photo_url:\s*buildGooglePhotoMediaUrl\(place/);
  assert.match(venueController, /getVenuePhoto/);
  assert.match(venueController, /Cache-Control/);
  assert.match(venueController, /decorateVenueMedia/);
  assert.match(venueRoutes, /\/:id\/photo/);
  assert.match(webGuide, /optimizedPhotoUrl\(venue\.photo_url,\s*venue\.photo_variants,\s*'thumb'\)/);
  assert.match(webVenueDetail, /google_photo_attributions/);
  assert.match(webVenueDetail, /Photo Google Places/);
  assert.match(nativeGuide, /optimizedPhotoUrl\(item\.photo_url,\s*item\.photo_variants,\s*'thumb'\)/);
  assert.match(nativeVenueDetail, /google_photo_attributions/);
  assert.match(nativeVenueDetail, /Photo Google Places/);
});

test('Rules: Agenda imports TIKERAMA Cote dIvoire events without copying media', async () => {
  const service = await read('server/src/services/tikeramaAgendaService.js');
  const venueController = await read('server/src/controllers/venueController.js');
  const webAgenda = await read('web/src/pages/AgendaPage.tsx');
  const nativeAgenda = await read('src/screens/agenda/AgendaScreen.tsx');

  assert.match(service, /TIKERAMA_SOURCE = 'TIKERAMA'/);
  assert.match(service, /COTE_D_IVOIRE/);
  assert.match(service, /if \(!found\) return null/);
  assert.match(service, /hasIvoryCoastLocation/);
  assert.match(service, /locationText/);
  assert.match(service, /return \{ \.\.\.candidate, city: city \|\| DEFAULT_CITY \}/);
  assert.match(service, /external_ticket_url/);
  assert.match(service, /source_label:\s*'Billetterie via TIKERAMA'/);
  assert.match(service, /maxEvents/);
  assert.match(service, /maxListingPaths/);
  assert.match(service, /requestTimeoutMs/);
  assert.match(service, /venue_events/);
  assert.match(service, /venues/);
  assert.doesNotMatch(service, /bucket\(/);
  assert.doesNotMatch(service, /uploadBytes/);
  assert.match(venueController, /syncTikeramaAgendaIfNeeded/);
  assert.match(venueController, /await syncTikeramaAgendaIfNeeded/);
  assert.match(venueController, /maxEvents:\s*forceExternalRefresh \? undefined : 4/);
  assert.doesNotMatch(venueController, /const externalSync = syncTikeramaAgendaIfNeeded/);
  assert.match(webAgenda, /BILLETTERIE TIKERAMA/);
  assert.match(webAgenda, /openExternalEvent/);
  assert.match(nativeAgenda, /Billetterie TIKERAMA/);
  assert.match(nativeAgenda, /Linking\.openURL/);
});

test('Rules: Guide venue detail returns to the selected venue instead of agenda', async () => {
  const webGuide = await read('web/src/pages/GuidePage.tsx');
  const webVenueDetail = await read('web/src/pages/VenueDetailPage.tsx');

  assert.match(webGuide, /from:\s*'\/guide'/);
  assert.match(webGuide, /scrollToVenueId:\s*venue\.id/);
  assert.match(webGuide, /guideState:\s*\{\s*searchQuery,\s*activeCategory\s*\}/);
  assert.match(webGuide, /venue-card-\$\{venue\.id\}/);
  assert.match(webVenueDetail, /routeState\.from === '\/guide'/);
  assert.match(webVenueDetail, /navigate\('\/guide'/);
  assert.match(webVenueDetail, /scrollToVenueId:\s*routeState\.scrollToVenueId \|\| venue\?\.id/);
});

test('Rules: Web mobile PWA reinstall help and Experiences rail stay usable', async () => {
  const pwaPrompt = await read('web/src/components/PWAInstallPrompt.tsx');
  const experiencesPage = await read('web/src/pages/ExperiencesPage.tsx');

  assert.match(pwaPrompt, /INSTALL_HELP_SEEN_KEY/);
  assert.match(pwaPrompt, /md:hidden/);
  assert.match(pwaPrompt, /Ouvrir Galant/);
  assert.match(pwaPrompt, /liste des applications/);
  assert.match(pwaPrompt, /appinstalled/);
  assert.match(pwaPrompt, /useLocation/);
  assert.match(pwaPrompt, /pathname\.startsWith\('\/chat\/'\)/);
  assert.match(pwaPrompt, /!isVisible \|\| isChatRoute/);
  assert.match(experiencesPage, /isTabRailCompact/);
  assert.match(experiencesPage, /window\.addEventListener\('scroll'/);
  assert.match(experiencesPage, /window\.innerWidth < 768/);
  assert.match(experiencesPage, /-translate-y-3/);
});

test('Rules: Web push notifications are fully wired', async () => {
  const authContext = await read('web/src/context/AuthContext.tsx');
  const firebase = await read('web/src/firebase.ts');
  const viteConfig = await read('web/vite.config.ts');
  const appHosting = await read('web/apphosting.yaml');
  const envTypes = await read('src/env.d.ts');

  assert.match(firebase, /getWebMessaging/);
  assert.match(firebase, /isSupported/);
  assert.match(authContext, /VITE_FIREBASE_VAPID_KEY/);
  assert.match(authContext, /navigator\.serviceWorker\.register/);
  assert.match(authContext, /navigator\.serviceWorker\.getRegistration/);
  assert.doesNotMatch(authContext, /register\(\s*`\$\{baseUrl\}firebase-messaging-sw\.js`/);
  assert.match(authContext, /serviceWorkerRegistration/);
  assert.match(authContext, /getToken\(messaging/);
  assert.match(authContext, /onMessage\(messaging/);
  assert.match(authContext, /platform:\s*'web'/);
  assert.match(authContext, /updateDoc\(tokenDoc\.ref/);
  assert.match(viteConfig, /galant-firebase-messaging-sw/);
  assert.match(viteConfig, /loadEnv/);
  assert.match(viteConfig, /firebase-messaging-sw\.js/);
  assert.match(viteConfig, /importScripts:\s*\['firebase-messaging-sw\.js'\]/);
  assert.match(viteConfig, /onBackgroundMessage/);
  assert.match(viteConfig, /if \(payload\.notification\) return/);
  assert.match(viteConfig, /notificationclick/);
  assert.match(appHosting, /VITE_FIREBASE_VAPID_KEY/);
  assert.match(envTypes, /VITE_FIREBASE_VAPID_KEY/);
});

test('Rules: Back navigation uses safe fallbacks across web and native surfaces', async () => {
  const navigationBack = await read('src/lib/navigationBack.ts');
  const nativeFiles = [
    'src/screens/messages/ChatScreen.tsx',
    'src/screens/premium/LikesInboxScreen.tsx',
    'src/screens/premium/LikesReceivedScreen.tsx',
    'src/screens/guide/VenueDetailScreen.tsx',
    'src/screens/apps/SentinelScreen.tsx',
    'src/screens/home/StatusScreen.tsx',
    'src/screens/profile/BoostedProfileDetailScreen.tsx',
    'src/screens/verify/VerifyScreen.tsx',
    'src/screens/boost/BoostScreen.tsx',
    'src/screens/premium/PremiumScreen.tsx',
    'src/screens/partner/PartnerPremiumScreen.tsx',
    'src/screens/auth/ResetPasswordScreen.tsx',
  ];
  const webFiles = [
    'web/src/pages/TermsPage.tsx',
    'web/src/pages/PrivacyPage.tsx',
    'web/src/pages/ProfileDetailPage.tsx',
    'web/src/pages/PartnerPremiumPage.tsx',
    'web/src/pages/VenueDetailPage.tsx',
  ];

  assert.match(navigationBack, /canGoBack/);
  assert.match(navigationBack, /fallbackRoute/);
  for (const file of nativeFiles) {
    assert.match(await read(file), /safeGoBack/);
  }
  for (const file of webFiles) {
    const code = await read(file);
    assert.match(code, /window\.history\.state\?\.idx/);
    assert.match(code, /handleBack/);
  }
});

test('Rules: Venue suggestions in chat are actionable across web and mobile', async () => {
  const venueController = await read('server/src/controllers/venueController.js');
  const messageController = await read('server/src/controllers/messageController.js');
  const venueRoutes = await read('server/src/routes/venueRoutes.js');
  const webProposeModal = await read('web/src/components/ProposeVenueModal.tsx');
  const webChat = await read('web/src/pages/ChatPage.tsx');
  const webVenueDetail = await read('web/src/pages/VenueDetailPage.tsx');
  const nativeVenueDetail = await read('src/screens/guide/VenueDetailScreen.tsx');
  const nativeChatItem = await read('src/screens/messages/components/ChatMessageItem.tsx');

  assert.match(venueController, /getVenueById/);
  assert.match(venueRoutes, /\/:id/);
  assert.match(webProposeModal, /messageType:\s*'VENUE_SUGGESTION'/);
  assert.match(webProposeModal, /address:\s*venue\.address/);
  assert.match(webProposeModal, /google_maps_uri:\s*venue\.google_maps_uri/);
  assert.match(webChat, /openVenueSuggestion/);
  assert.match(webChat, /handleVenueOpinion/);
  assert.match(webChat, /VENUE_SUGGESTION_OPINION/);
  assert.match(webChat, /const sourceMessageId = sourceMessage\?\.id/);
  assert.match(webChat, /const venueId = sourceMessage\?\.metadata\?\.venue\?\.id/);
  assert.match(webChat, /source_message_id:\s*sourceMessageId/);
  assert.match(webChat, /venue_id:\s*venueId/);
  assert.match(webVenueDetail, /\/api\/venues\/\$\{id\}/);
  assert.match(nativeVenueDetail, /messageType:\s*'VENUE_SUGGESTION'/);
  assert.match(nativeVenueDetail, /Proposer ce lieu/);
  assert.match(nativeChatItem, /openVenueSuggestion/);
  assert.match(nativeChatItem, /sendVenueOpinion/);
  assert.match(nativeChatItem, /if \(!item\.id \|\| !venueData\?\.id\)/);
  assert.match(nativeChatItem, /source_message_id:\s*item\.id/);
  assert.match(nativeChatItem, /venue_id:\s*venueData\.id/);
  assert.match(nativeChatItem, /VenueDetail/);
  assert.match(messageController, /hasPriorVenueSuggestionForReply/);
  assert.match(messageController, /VENUE_SUGGESTION_OPINION/);
  assert.match(messageController, /if \(!sourceMessageId \|\| !venueId\) return false/);
  assert.match(messageController, /message\.message_type === 'VENUE_SUGGESTION'/);
  assert.match(messageController, /alreadyConsumed/);
  assert.match(messageController, /consumedSourceId === sourceMessageId/);
  assert.match(messageController, /consumedVenueId === venueId/);
  assert.match(messageController, /canReplyToVenueSuggestion/);
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

test('Rules: Dark appearance is the default on web and native', async () => {
  const webAuthContext = await read('web/src/context/AuthContext.tsx');
  const nativeAppContext = await read('src/state/AppContext.tsx');
  const nativeApp = await read('App.tsx');

  assert.match(webAuthContext, /activeTheme:\s*'dark'/);
  assert.match(webAuthContext, /return 'dark';/);
  assert.match(nativeAppContext, /useState<AppThemePreference>\('dark'\)/);
  assert.match(nativeApp, /activeTheme/);
  assert.match(nativeApp, /StatusBar style=\{activeTheme === 'dark' \? 'light' : 'dark'\}/);
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
