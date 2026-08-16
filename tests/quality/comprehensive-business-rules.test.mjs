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
  assert.match(webDiscover, /CirclePlay/);
  assert.match(webDiscover, /navigate\('\/stories'\)/);
  assert.doesNotMatch(webDiscover, /storyBubbles/);
  assert.doesNotMatch(webDiscover, /initialStatusId/);
});

test('Rules: Web Stories are paginated and paid one-shot access is capped', async () => {
  const webStories = await read('web/src/pages/StoriesPage.tsx');
  const statusController = await read('server/src/controllers/statusController.js');
  const usageService = await read('server/src/services/usageService.js');

  assert.match(webStories, /STORY_PAGE_SIZE = 10/);
  assert.match(webStories, /\/api\/statuses\?limit=\$\{STORY_PAGE_SIZE\}&offset=\$\{offset\}&pageInfo=true/);
  assert.match(webStories, /nextStatusesOffsetRef/);
  assert.match(webStories, /data\.nextOffset/);
  assert.match(webStories, /data\.hasMore/);
  assert.match(webStories, /IntersectionObserver/);
  assert.match(webStories, /fetchStatuses\(\{ append: true \}\)/);
  assert.match(webStories, /consulter 10 stories maximum/);
  assert.match(statusController, /STORY_PAGE_LIMIT = 10/);
  assert.match(statusController, /STORY_LEGACY_LIMIT = 35/);
  assert.match(statusController, /wantsPaginationInfo/);
  assert.match(statusController, /STORY_PURCHASE_VIEW_LIMIT = 10/);
  assert.match(statusController, /hasStorySubscriptionAccess/);
  assert.match(statusController, /hasStoryPurchaseAccess/);
  assert.doesNotMatch(statusController, /hasStandardAccess/);
  assert.match(usageService, /hasStoryPurchaseAccess/);
  assert.match(usageService, /status === 'UNUSED'/);
  assert.match(usageService, /status !== 'USED'/);
  assert.match(usageService, /accessWindowMs = 24 \* 3600 \* 1000/);
  assert.match(usageService, /consumed_at \|\| item\.created_at/);
});

test('Rules: Discovery header exposes notifications with compact title and grid/filter actions', async () => {
  const nativeHome = await read('src/screens/home/HomeScreen.tsx');
  const nativeGrid = await read('src/screens/discover/DiscoverGridScreen.tsx');
  const webDiscover = await read('web/src/pages/DiscoverPage.tsx');

  assert.match(nativeHome, /Bell/);
  assert.match(nativeHome, /notificationUnreadCount/);
  assert.match(nativeHome, /\/api\/notifications\/unread-count/);
  assert.match(nativeHome, /navigation\.navigate\('Notifications'\)/);
  assert.match(nativeHome, /openDiscoverGrid/);
  assert.match(nativeHome, /grid_consultations_remaining/);
  assert.match(nativeHome, /setShowDiscoverGridModal\(true\)/);
  assert.match(nativeHome, /DiscoverGridPurchaseModal/);
  assert.match(nativeHome, /DISCOVER_GRID_UNLOCK/);
  assert.match(nativeGrid, /isGrid=true/);
  assert.match(nativeHome, /headerTitle:\s*\{\s*flex:\s*1,\s*minWidth:\s*0/);
  assert.match(nativeHome, /numberOfLines=\{1\}/);
  assert.match(nativeHome, /brand:\s*\{\s*fontSize:\s*25/);
  assert.match(nativeHome, /subtitle:\s*\{\s*fontSize:\s*10/);

  assert.match(webDiscover, /Bell/);
  assert.match(webDiscover, /CirclePlay/);
  assert.match(webDiscover, /ShoppingBag/);
  assert.match(webDiscover, /navigate\('\/store'\)/);
  assert.match(webDiscover, /notificationUnreadCount/);
  assert.match(webDiscover, /\/api\/notifications\/unread-count/);
  assert.match(webDiscover, /navigate\('\/notifications',\s*\{\s*state:\s*\{\s*from:\s*'\/'\s*\}\s*\}\)/);
  assert.doesNotMatch(webDiscover, /discover_subtitle/);
  assert.doesNotMatch(webDiscover, /text-2xl sm:text-3xl/);
  assert.match(webDiscover, /max-w-3xl/);
  assert.match(webDiscover, /px-1 sm:px-3/);
  assert.match(webDiscover, /border-4 border-white/);
  assert.match(webDiscover, /grid w-full grid-cols-5 items-center/);
  assert.match(webDiscover, /relative mx-auto w-10 h-10/);
  assert.doesNotMatch(webDiscover, /FeatureHighlight/);
  const storeActionIndex = webDiscover.indexOf("navigate('/store')");
  const storiesActionIndex = webDiscover.indexOf("navigate('/stories')");
  const galleryActionIndex = webDiscover.indexOf('onClick={handleGridTransition}');
  const notificationsActionIndex = webDiscover.indexOf("navigate('/notifications'");
  const filterActionIndex = webDiscover.indexOf('setIsFilterOpen(true)');

  assert.ok(storeActionIndex > -1);
  assert.ok(storiesActionIndex > storeActionIndex);
  assert.ok(galleryActionIndex > storiesActionIndex);
  assert.ok(notificationsActionIndex > galleryActionIndex);
  assert.ok(filterActionIndex > notificationsActionIndex);
});

test('Rules: Web discovery filters apply only after explicit confirmation', async () => {
  const webDiscover = await read('web/src/pages/DiscoverPage.tsx');
  const filterModal = await read('web/src/components/FilterModal.tsx');

  assert.match(webDiscover, /DEFAULT_DISCOVER_FILTERS/);
  assert.match(webDiscover, /const \[isApplyingFilters, setIsApplyingFilters\] = useState\(false\)/);
  assert.match(webDiscover, /const handleApplyFilters = useCallback/);
  assert.match(webDiscover, /setIsApplyingFilters\(true\)/);
  assert.match(webDiscover, /authLoading \|\| isApplyingFilters \|\| \(loading && suggestions\.length === 0\)/);
  assert.match(webDiscover, /onApply=\{handleApplyFilters\}/);
  assert.match(webDiscover, /defaultFilters=\{DEFAULT_DISCOVER_FILTERS\}/);
  assert.doesNotMatch(webDiscover, /setFilters=\{setFilters\}/);

  assert.match(filterModal, /const \[draftFilters, setDraftFilters\] = useState\(filters\)/);
  assert.match(filterModal, /if \(isOpen\)/);
  assert.match(filterModal, /onApply\(\{ \.\.\.draftFilters \}\)/);
  assert.match(filterModal, /onClick=\{handleApply\}/);
  assert.match(filterModal, /onClick=\{handleReset\}/);
  assert.doesNotMatch(filterModal, /\bsetFilters\b/);
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

test('Rules: Agenda imports TIKERAMA Cote dIvoire events through admin curation without copying media', async () => {
  const service = await read('server/src/services/tikeramaAgendaService.js');
  const venueController = await read('server/src/controllers/venueController.js');
  const adminController = await read('server/src/controllers/adminController.js');
  const adminRoutes = await read('server/src/routes/adminRoutes.js');
  const adminLayout = await read('web/src/pages/admin/AdminLayout.tsx');
  const adminAgendaSeeder = await read('web/src/pages/admin/AdminAgendaSeeder.tsx');
  const app = await read('web/src/App.tsx');
  const webAgenda = await read('web/src/pages/AgendaPage.tsx');
  const nativeAgenda = await read('src/screens/agenda/AgendaScreen.tsx');

  assert.match(service, /TIKERAMA_SOURCE = 'TIKERAMA'/);
  assert.match(service, /COTE_D_IVOIRE/);
  assert.match(service, /if \(!found\) return null/);
  assert.match(service, /hasIvoryCoastLocation/);
  assert.match(service, /locationText/);
  assert.match(service, /return \{ \.\.\.candidate, city \}/);
  assert.match(service, /external_ticket_url/);
  assert.match(service, /source_label:\s*'Billetterie via TIKERAMA'/);
  assert.match(service, /searchTikeramaAgendaCandidates/);
  assert.match(service, /importSelectedTikeramaAgendaEvents/);
  assert.match(service, /TIKERAMA_AGENDA_CATEGORIES/);
  assert.match(service, /TIKERAMA_SEARCH_BUDGET_MS/);
  assert.match(service, /TIKERAMA_SEARCH_CONCURRENCY/);
  assert.match(service, /deadlineAt/);
  assert.match(service, /Promise\.all\(Array\.from/);
  assert.match(service, /const resolvedCity = event\.city \|\| cleanCity/);
  assert.match(service, /maxEvents/);
  assert.match(service, /maxListingPaths/);
  assert.match(service, /requestTimeoutMs/);
  assert.match(service, /venue_events/);
  assert.match(service, /venues/);
  assert.doesNotMatch(service, /bucket\(/);
  assert.doesNotMatch(service, /uploadBytes/);
  assert.doesNotMatch(venueController, /syncTikeramaAgendaIfNeeded/);
  assert.doesNotMatch(venueController, /const externalSync = syncTikeramaAgendaIfNeeded/);
  assert.match(adminController, /searchTikeramaAgenda/);
  assert.match(adminController, /importTikeramaAgenda/);
  assert.match(adminRoutes, /\/agenda\/tikerama\/search/);
  assert.match(adminRoutes, /\/agenda\/tikerama\/import/);
  assert.match(adminLayout, /\/admin\/agenda-seeder/);
  assert.match(adminAgendaSeeder, /Rechercher sur Tikerama/);
  assert.match(adminAgendaSeeder, /selectedCandidates/);
  assert.match(app, /AdminAgendaSeeder/);
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
  assert.match(pwaPrompt, /isDiscoverRoute/);
  assert.match(pwaPrompt, /normalizedPathname/);
  assert.match(pwaPrompt, /replace\(\/\\\/\+\$\/,\s*''\)/);
  assert.match(pwaPrompt, /normalizedPathname === '\/'/);
  assert.match(pwaPrompt, /normalizedPathname === '\/discover-grid'/);
  assert.match(pwaPrompt, /!isVisible \|\| !isDiscoverRoute/);
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

test('Rules: Internal notification center is wired across server, web and native', async () => {
  const centerService = await read('server/src/services/notificationCenterService.js');
  const notificationController = await read('server/src/controllers/notificationController.js');
  const notificationRoutes = await read('server/src/routes/notificationRoutes.js');
  const messageController = await read('server/src/controllers/messageController.js');
  const matchmakingController = await read('server/src/controllers/matchmakingController.js');
  const subscriptionService = await read('server/src/services/subscriptionService.js');
  const adminController = await read('server/src/controllers/adminController.js');
  const venueController = await read('server/src/controllers/venueController.js');
  const webApp = await read('web/src/App.tsx');
  const webProfile = await read('web/src/pages/ProfilePage.tsx');
  const webNotifications = await read('web/src/pages/NotificationsPage.tsx');
  const nativeNavigator = await read('src/navigation/MainNavigator.tsx');
  const nativeProfile = await read('src/screens/profile/ProfileScreen.tsx');
  const nativeProfileMenu = await read('src/screens/profile/components/ProfileMenu.tsx');
  const nativeNotifications = await read('src/screens/notifications/NotificationsScreen.tsx');

  assert.match(centerService, /NOTIFICATION_TYPES/);
  assert.match(centerService, /createInternalNotification/);
  assert.match(centerService, /target_route/);
  assert.match(centerService, /legacyEventToNotification/);
  assert.match(centerService, /Lazy require avoids a circular dependency/);
  assert.match(centerService, /runTransaction/);
  assert.match(centerService, /duplicate:\s*true/);
  assert.match(centerService, /legacy_event_/);
  assert.match(notificationController, /getUnreadCount/);
  assert.match(notificationController, /archiveNotification/);
  assert.match(notificationController, /legacyEventToNotification/);
  assert.match(notificationController, /collectNotificationDocs/);
  assert.match(notificationController, /commitUpdatesInChunks/);
  assert.match(notificationController, /parseTypeList/);
  assert.match(notificationController, /excludeTypes/);
  assert.match(notificationController, /excludedTypes\.has\(item\.type\)/);
  assert.match(notificationController, /LEGACY_PREFIX = 'legacy_event_'/);
  assert.match(notificationController, /offset/);
  assert.doesNotMatch(notificationController, /where\('event_type'/);
  assert.doesNotMatch(notificationController, /where\('is_read'/);
  assert.doesNotMatch(notificationController, /orderBy\('created_at'/);
  assert.doesNotMatch(notificationController, /startAfter/);
  assert.match(notificationRoutes, /\/unread-count/);
  assert.match(notificationRoutes, /\/:id\/archive/);
  assert.match(messageController, /createNotificationSafely/);
  assert.match(messageController, /NOTIFICATION_TYPES\.MESSAGE/);
  assert.match(messageController, /NOTIFICATION_TYPES\.PARTNER/);
  assert.match(matchmakingController, /createNotificationSafely/);
  assert.match(matchmakingController, /NOTIFICATION_TYPES\.LIKE_RECEIVED/);
  assert.match(matchmakingController, /NOTIFICATION_TYPES\.ROSE_RECEIVED/);
  assert.match(matchmakingController, /NOTIFICATION_TYPES\.MATCH_CREATED/);
  assert.match(subscriptionService, /NOTIFICATION_TYPES\.PAYMENT_SUCCESS/);
  assert.match(adminController, /NOTIFICATION_TYPES\.SECURITY/);
  assert.match(adminController, /chunkRows/);
  assert.doesNotMatch(adminController, /batch\.set\(notificationRef/);
  assert.match(adminController, /event_name:\s*'ADMIN_BROADCAST'/);
  assert.match(venueController, /NOTIFICATION_TYPES\.AGENDA/);
  assert.match(venueController, /agenda_created_/);
  assert.match(webApp, /\/notifications/);
  assert.match(webProfile, /\/api\/notifications\/unread-count/);
  assert.match(webProfile, /navigate\('\/notifications',\s*\{\s*state:\s*\{\s*from:\s*'\/profile'\s*\}\s*\}\)/);
  assert.doesNotMatch(webProfile, /navigate\('\/likes'\)/);
  assert.doesNotMatch(webProfile, /navigate\('\/roses'\)/);
  assert.doesNotMatch(webProfile, /\/api\/super-likes\/received/);
  assert.match(webNotifications, /markAllAsRead/);
  assert.match(webNotifications, /archiveNotification/);
  assert.match(webNotifications, /target_route/);
  assert.match(webNotifications, /useLocation/);
  assert.match(webNotifications, /returnPath/);
  assert.match(webNotifications, /location\.state\?\.from/);
  assert.match(webNotifications, /navigate\(returnPath\)/);
  assert.match(webNotifications, /Vos alertes, likes et roses reçues au même endroit/);
  assert.match(webNotifications, /navigate\('\/likes'\)/);
  assert.match(webNotifications, /navigate\('\/roses'\)/);
  assert.match(webNotifications, /\/api\/super-likes\/received/);
  assert.match(webNotifications, /likesQuickCount/);
  assert.match(webNotifications, /rosesInboxCount/);
  assert.match(webNotifications, /QUICK_BOX_TYPES/);
  assert.match(webNotifications, /excludeTypes/);
  assert.match(webNotifications, /Journal d’activité/);
  assert.match(webNotifications, /Historique/);
  assert.match(webNotifications, /loading:\s*authLoading/);
  assert.match(webNotifications, /if \(authLoading\) return/);
  assert.match(webNotifications, /\[authLoading,\s*user\?\.uid\]/);
  assert.match(nativeNavigator, /NotificationsScreen/);
  assert.match(nativeNavigator, /Notifications: undefined/);
  assert.match(nativeProfile, /\/api\/notifications\/unread-count/);
  assert.match(nativeProfileMenu, /onOpenNotifications/);
  assert.match(nativeNotifications, /\/api\/notifications/);
  assert.match(nativeNotifications, /markAllAsRead/);
  assert.match(nativeNotifications, /archiveNotification/);
  assert.match(nativeNotifications, /openNotificationTarget/);
});

test('Rules: Admin-user support messaging is bidirectional on web', async () => {
  const serverIndex = await read('server/src/index.js');
  const supportRoutes = await read('server/src/routes/supportRoutes.js');
  const adminRoutes = await read('server/src/routes/adminRoutes.js');
  const supportController = await read('server/src/controllers/supportController.js');
  const webApp = await read('web/src/App.tsx');
  const webSupport = await read('web/src/pages/SupportPage.tsx');
  const webAdminSupport = await read('web/src/pages/admin/AdminSupport.tsx');
  const webNotifications = await read('web/src/pages/NotificationsPage.tsx');

  assert.match(serverIndex, /\/api\/support/);
  assert.match(supportRoutes, /\/thread/);
  assert.match(supportRoutes, /\/messages/);
  assert.match(supportRoutes, /\/read/);
  assert.match(adminRoutes, /\/support\/threads/);
  assert.match(adminRoutes, /\/support\/threads\/:threadId\/messages/);
  assert.match(adminRoutes, /\/support\/threads\/:threadId\/reply/);
  assert.match(adminRoutes, /\/support\/threads\/:threadId\/status/);
  assert.match(supportController, /support_threads/);
  assert.match(supportController, /sendUserSupportMessage/);
  assert.match(supportController, /sendAdminSupportReply/);
  assert.match(supportController, /notifyAdmins/);
  assert.match(supportController, /notifyUser/);
  assert.match(supportController, /NOTIFICATION_TYPES\.ADMIN/);
  assert.match(supportController, /unread_for_admin:\s*FieldValue\.increment\(1\)/);
  assert.match(supportController, /unread_for_user:\s*FieldValue\.increment\(1\)/);
  assert.match(supportController, /targetRoute:\s*'\/support'/);
  assert.match(supportController, /\/admin\/support\?thread=/);
  assert.match(webApp, /SupportPage/);
  assert.match(webApp, /path="\/support"/);
  assert.match(webSupport, /\/api\/support\/thread/);
  assert.match(webSupport, /\/api\/support\/messages/);
  assert.match(webSupport, /\/api\/support\/read/);
  assert.match(webSupport, /Ecrire a l'administration/);
  assert.match(webAdminSupport, /\/api\/admin\/support\/threads/);
  assert.match(webAdminSupport, /\/messages/);
  assert.match(webAdminSupport, /\/reply/);
  assert.match(webAdminSupport, /\/status/);
  assert.match(webAdminSupport, /Support Inbox/);
  assert.doesNotMatch(webAdminSupport, /Simulation de/);
  assert.match(webNotifications, /navigate\('\/support'\)/);
  assert.match(webNotifications, /supportTitle/);
});

test('Rules: Web profile Store groups subscriptions and global purchases', async () => {
  const webApp = await read('web/src/App.tsx');
  const webProfile = await read('web/src/pages/ProfilePage.tsx');
  const webStore = await read('web/src/pages/StorePage.tsx');
  const paymentHelpers = await read('server/src/utils/paymentHelpers.js');

  assert.match(webApp, /StorePage/);
  assert.match(webApp, /path="\/store"/);
  assert.match(webProfile, /navigate\('\/store'\)/);
  assert.match(webProfile, /Store Galant/);
  assert.doesNotMatch(webProfile, /navigate\('\/boost'\)/);
  assert.doesNotMatch(webProfile, /t\('subscriptions'\)/);
  assert.doesNotMatch(webProfile, /Action Item: Boosts/);
  assert.doesNotMatch(webProfile, /\bCreditCard\b/);
  assert.doesNotMatch(webProfile, /\bRocket\b/);
  assert.doesNotMatch(webProfile, /mailto:support@galant\.app/);
  assert.doesNotMatch(webProfile, /\bHelpCircle\b/);
  assert.match(webStore, /Store Galant/);
  assert.match(webStore, /Abonnements/);
  assert.match(webStore, /MONTHLY/);
  assert.match(webStore, /QUARTERLY/);
  assert.match(webStore, /ROSE_PACK/);
  assert.match(webStore, /GOLDEN_ROSE/);
  assert.match(webStore, /BOOST/);
  assert.match(webStore, /DISCOVER_GRID_UNLOCK/);
  assert.match(webStore, /LIKES_INBOX_2H/);
  assert.match(webStore, /STORY_UPLOAD/);
  assert.match(webStore, /PARTNER_DISCOVERY_UNLOCK/);
  assert.match(webStore, /hasPartnerDiscoveryAccess/);
  assert.match(webStore, /type === 'PARTNER_DISCOVERY_UNLOCK' && hasPartnerDiscoveryAccess/);
  assert.match(webStore, /alreadyGranted/);
  assert.match(webStore, /disabled=\{disabled\}/);
  assert.match(webStore, /Inclus/);
  assert.match(paymentHelpers, /STORY_UPLOAD/);
  assert.match(paymentHelpers, /PARTNER_DISCOVERY_UNLOCK/);
});

test('Rules: Privacy data actions live inside profile settings', async () => {
  const webProfile = await read('web/src/pages/ProfilePage.tsx');
  const webSettings = await read('web/src/components/SettingsModal.tsx');
  const nativeProfile = await read('src/screens/profile/ProfileScreen.tsx');
  const nativeSettings = await read('src/screens/profile/components/SettingsModal.tsx');
  const nativeMenu = await read('src/screens/profile/components/ProfileMenu.tsx');

  assert.match(webSettings, /onExportData/);
  assert.match(webSettings, /onDeleteAccount/);
  assert.match(webSettings, /download_my_data/);
  assert.match(webSettings, /delete_my_account/);
  assert.match(webSettings, /max-h-\[90vh\]/);
  assert.match(webProfile, /onExportData=\{handleExportData\}/);
  assert.match(webProfile, /onDeleteAccount=\{handleDeleteAccount\}/);
  assert.doesNotMatch(webProfile, /GDPR Actions/);

  assert.match(nativeSettings, /onExportData/);
  assert.match(nativeSettings, /onDeleteAccount/);
  assert.match(nativeSettings, /download_my_data/);
  assert.match(nativeSettings, /delete_my_account/);
  assert.match(nativeSettings, /ScrollView/);
  assert.match(nativeProfile, /onExportData=\{exportData\}/);
  assert.match(nativeProfile, /onDeleteAccount=\{deleteAccount\}/);
  assert.doesNotMatch(nativeMenu, /onExportData/);
  assert.doesNotMatch(nativeMenu, /onDeleteAccount/);
});

test('Rules: User-facing counters and commerce avoid Firestore composite index traps', async () => {
  const notificationController = await read('server/src/controllers/notificationController.js');
  const matchmakingController = await read('server/src/controllers/matchmakingController.js');
  const venueController = await read('server/src/controllers/venueController.js');
  const usageService = await read('server/src/services/usageService.js');
  const subscriptionService = await read('server/src/services/subscriptionService.js');
  const statusController = await read('server/src/controllers/statusController.js');
  const notificationService = await read('server/src/services/notificationService.js');

  for (const file of [
    notificationController,
    matchmakingController,
    venueController,
    usageService,
    subscriptionService,
    notificationService,
  ]) {
    assert.doesNotMatch(file, /\.where\([^)\n]+\)\s*\.\s*orderBy\(/);
    assert.doesNotMatch(file, /\.where\([^)\n]+\)\s*\.\s*where\(/);
  }

  const statusControllerWithoutAllowedExpiryOrdering = statusController.replace(
    /\.where\('expires_at', '>', now\)\s*\.\s*orderBy\('expires_at', 'desc'\)/g,
    ''
  );
  assert.doesNotMatch(statusControllerWithoutAllowedExpiryOrdering, /\.where\([^)\n]+\)\s*\.\s*orderBy\(/);
  assert.doesNotMatch(statusController, /\.where\([^)\n]+\)\s*\.\s*where\(/);

  assert.match(matchmakingController, /incomingSuperLikesSnapshot/);
  assert.match(matchmakingController, /filter\(row => row\.is_super_like === true\)/);
  assert.match(venueController, /filter\(ev => !type \|\| ev\.event_type === type\)/);
  assert.match(venueController, /doc\(`vchat_\$\{meId\}_\$\{id\}`\)/);
  assert.match(usageService, /usageDocId/);
  assert.match(usageService, /FieldValue\.increment/);
  assert.match(subscriptionService, /filter\(sub => sub\.status === 'active'/);
});

test('Rules: Server video processing uses the system ffmpeg binary for reproducible Cloud Run builds', async () => {
  const packageJson = await read('server/package.json');
  const packageLock = await read('server/package-lock.json');
  const dockerfile = await read('server/Dockerfile');
  const mediaController = await read('server/src/controllers/mediaController.js');
  const mediaMaintenanceService = await read('server/src/services/mediaMaintenanceService.js');
  const ffmpegBinary = await read('server/src/utils/ffmpegBinary.js');

  assert.doesNotMatch(packageJson, /ffmpeg-static/);
  assert.doesNotMatch(packageLock, /ffmpeg-static/);
  assert.match(dockerfile, /apt-get install -y ffmpeg/);
  assert.match(dockerfile, /npm ci --omit=dev/);
  assert.match(ffmpegBinary, /fs\.existsSync\('\/usr\/bin\/ffmpeg'\)/);
  assert.match(ffmpegBinary, /if \(ffmpegPath\) ffmpeg\.setFfmpegPath\(ffmpegPath\)/);
  assert.match(mediaController, /configureFfmpeg/);
  assert.match(mediaMaintenanceService, /configureFfmpeg/);
  assert.doesNotMatch(mediaController, /require\('ffmpeg-static'\)/);
  assert.doesNotMatch(mediaMaintenanceService, /require\('ffmpeg-static'\)/);
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

test('Rules: Cost controls limit reads and cache expensive external calls', async () => {
  const statusController = await read('server/src/controllers/statusController.js');
  const venueController = await read('server/src/controllers/venueController.js');
  const googleMapsService = await read('server/src/services/googleMapsService.js');
  const tikeramaService = await read('server/src/services/tikeramaAgendaService.js');
  const webAuth = await read('web/src/context/AuthContext.tsx');
  const nativeContext = await read('src/state/AppContext.tsx');
  const deployWorkflow = await read('.github/workflows/deploy-server.yml');

  assert.match(statusController, /clampLimit/);
  assert.match(statusController, /\.orderBy\('expires_at', 'desc'\)/);
  assert.match(statusController, /\.offset\(nextOffset\)/);
  assert.match(statusController, /hasMore/);
  assert.match(statusController, /nextOffset/);
  assert.match(venueController, /clampLimit/);
  assert.match(venueController, /query = query\.limit\(city \? safeLimit \* 3 : safeLimit\)/);
  assert.match(venueController, /attendanceDoc = await db\.collection\('event_attendance'\)\.doc\(`\$\{ev\.id\}_\$\{meId\}`\)\.get\(\)/);
  assert.match(venueController, /attendees_count:\s*FieldValue\.increment\(1\)/);
  assert.match(venueController, /Math\.max\(0,\s*Number\(eventDoc\.data\(\)\?\.attendees_count/);
  assert.match(venueController, /city_normalized/);
  assert.match(venueController, /where\('venue_id',\s*'==',\s*venueId\)[\s\S]*\.limit\(safeLimit\)/);
  assert.match(venueController, /where\('user_id',\s*'==',\s*req\.user\.id\)[\s\S]*\.limit\(safeLimit\)/);
  assert.match(venueController, /view_count:\s*FieldValue\.increment\(1\)/);
  assert.match(venueController, /venue_analytics'\)\.doc\(`\$\{id\}_\$\{req\.user\.id\}_\$\{dayKey\}`\)/);
  assert.match(googleMapsService, /partner_discovery_cache/);
  assert.match(googleMapsService, /USER_DISCOVERY_CACHE_DAYS/);
  assert.match(googleMapsService, /getCachedUserPartnerDiscovery/);
  assert.match(googleMapsService, /setCachedUserPartnerDiscovery/);
  assert.match(googleMapsService, /cache_hit:\s*true/);
  assert.match(tikeramaService, /city_normalized/);
  assert.match(tikeramaService, /attendees_count:\s*0/);
  assert.match(webAuth, /documentId/);
  assert.doesNotMatch(webAuth, /collection\(db,\s*COLLECTIONS\.PROFILES\),\s*where\('onboarding_completed'/);
  assert.match(nativeContext, /refreshProfilesForMatches/);
  assert.match(nativeContext, /\.limit\(80\)/);
  assert.match(deployWorkflow, /--min-instances 0/);
  assert.match(deployWorkflow, /--max-instances 10/);
  assert.match(deployWorkflow, /--concurrency 80/);
  assert.match(deployWorkflow, /GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest/);
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

test('Rules: Web language switcher persists and exposes FR EN accessibly', async () => {
  const webApp = await read('web/src/App.tsx');
  const webAuthContext = await read('web/src/context/AuthContext.tsx');
  const settingsModal = await read('web/src/components/SettingsModal.tsx');

  assert.match(webApp, /const nextLanguage = language === 'fr' \? 'en' : 'fr'/);
  assert.match(webApp, /onClick=\{\(\) => setLanguage\(nextLanguage\)\}/);
  assert.match(webApp, /aria-label=\{label\}/);
  assert.match(webAuthContext, /localStorage\.setItem\('galant_lang', lang\)/);
  assert.match(webAuthContext, /document\.documentElement\.lang = language/);
  assert.match(settingsModal, /\{t\('language'\)\}/);
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
