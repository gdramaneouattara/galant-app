import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('auth flow handles missing profile and suspended profile explicitly', async () => {
  const authFlow = await read('src/screens/auth/AuthFlowScreen.tsx');
  assert.match(authFlow, /profileError\.code\s*===\s*['"]PGRST116['"]/);
  assert.match(authFlow, /select\('id, suspended_at, onboarding_completed'\)/);
  assert.match(authFlow, /if\s*\(!profile\s*\|\|\s*!profile\.onboarding_completed\)/);
  assert.match(authFlow, /const resumeIncompleteOnboarding = async \(\) => \{/);
  assert.match(authFlow, /goTo\(\s*['"]identity['"]\s*\)/);
  assert.match(authFlow, /if\s*\(\s*profile\??\.suspended_at\s*\)/);
  assert.match(authFlow, /Compte suspendu/);
});

test('phone signup persists legal consent metadata after OTP verification', async () => {
  const authFlow = await read('src/screens/auth/AuthFlowScreen.tsx');
  assert.match(authFlow, /const \[otpMode, setOtpMode\] = useState<['"]signup['"] \| ['"]login['"] \| null>\(null\)/);
  assert.match(authFlow, /setOtpMode\(mode\)/);
  assert.match(authFlow, /if \(otpMode === 'signup'\)/);
  assert.match(authFlow, /supabase\.auth\.updateUser\(\{\s*data:\s*\{/s);
  assert.match(authFlow, /legal_terms_accepted_at:\s*acceptedAt/);
  assert.match(authFlow, /privacy_policy_accepted_at:\s*acceptedAt/);
});

test('api client defers missing EXPO_PUBLIC_API_BASE_URL check to request time', async () => {
  const api = await read('src/lib/api.ts');
  assert.match(api, /Intl\.DateTimeFormat\(\)\.resolvedOptions\(\)\.timeZone/);
  assert.match(api, /headers\.set\('X-Timezone', resolvedTimeZone\)/);
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
  assert.match(verifyScreen, /uploadArrayBufferToBucket/);
  assert.doesNotMatch(verifyScreen, /blob\(\)/);
  assert.match(verifyScreen, /launchCameraAsync/);
  assert.match(verifyScreen, /selfie_capture_mode:\s*'CAMERA'/);
  assert.match(verifyScreen, /value:\s*'ID_CARD'/);
  assert.match(verifyScreen, /value:\s*'DRIVERS_LICENSE'/);
});

test('auth flow enforces 3 to 6 profile photos before onboarding completion', async () => {
  const authFlow = await read('src/screens/auth/AuthFlowScreen.tsx');
  assert.match(authFlow, /form\.photos\.length\s*<\s*3/);
  assert.match(authFlow, /form\.photos\.length\s*>\s*6/);
  assert.match(authFlow, /Photos:\s*\{form\.photos\.length\}\/6/);
  assert.match(authFlow, /profil ne sera pas visible dans la d[ée]couverte tant qu'elles ne sont pas approuv[ée]es/i);
  assert.match(authFlow, /onboarding_completed:\s*true/);
});

test('home screen uses backend matchmaking suggestions and swipe actions', async () => {
  const homeScreen = await read('src/screens/home/HomeScreen.tsx');
  assert.match(homeScreen, /\/api\/matchmaking\/suggestions/);
  assert.match(homeScreen, /\/api\/matchmaking\/swipe/);
  assert.match(homeScreen, /\/api\/matchmaking\/view-profile/);
  assert.match(homeScreen, /isSuperLike/);
  assert.match(homeScreen, /Super Like envoye/);
  assert.match(homeScreen, /Super Like recu/);
  assert.match(homeScreen, /PanResponder\.create/);
});

test('profile badges expose verified, popular, active, premium and boosted states', async () => {
  const profileBadges = await read('src/components/ProfileBadges.tsx');
  assert.match(profileBadges, /isVerified \?\? user\.is_verified/);
  assert.match(profileBadges, /isPremium \?\? user\.is_premium/);
  assert.match(profileBadges, /likesCount >= 50/);
  assert.match(profileBadges, /Verifie/);
  assert.match(profileBadges, /Populaire/);
  assert.match(profileBadges, /Actif/);
  assert.match(profileBadges, /Premium/);
  assert.match(profileBadges, /Booste/);
});

test('chat screen uses backend message endpoint and moderation actions', async () => {
  const chatScreen = await read('src/screens/messages/ChatScreen.tsx');
  assert.match(chatScreen, /\/api\/messages\/send/);
  assert.match(chatScreen, /\/api\/messages\/read/);
  assert.match(chatScreen, /uploadArrayBufferToBucket/);
  assert.doesNotMatch(chatScreen, /blob\(\)/);
  assert.match(chatScreen, /\/api\/moderation\/report/);
  assert.match(chatScreen, /\/api\/moderation\/block/);
  assert.match(chatScreen, /Le texte est disponible pour tous les matchs/);
});

test('messages screen shows recent matches and conversation unread counters with real timestamps', async () => {
  const messagesScreen = await read('src/screens/messages/MessagesScreen.tsx');
  assert.match(messagesScreen, /Matchs Récents/);
  assert.match(messagesScreen, /Conversations/);
  assert.match(messagesScreen, /thread\.filter\(\(message\) => !message\.is_read && message\.sender_id !== currentUser\.id\)\.length/);
  assert.match(messagesScreen, /const lastActivityAt = lastMessage\?\.created_at \|\| match\.created_at/);
  assert.match(messagesScreen, /formatConversationTime\(lastActivityAt\)/);
  assert.doesNotMatch(messagesScreen, />Maintenant</);
});

test('community screens use backend community endpoints, realtime chat and member management', async () => {
  const communityScreen = await read('src/screens/community/CommunityScreen.tsx');
  const communityChatScreen = await read('src/screens/community/CommunityChatScreen.tsx');

  assert.match(communityScreen, /\/api\/communities/);
  assert.match(communityScreen, /\/api\/communities\/create/);
  assert.match(communityScreen, /\/api\/communities\/\$\{communityId\}\/join/);

  assert.match(communityChatScreen, /\/api\/communities\/\$\{communityId\}\/messages/);
  assert.match(communityChatScreen, /\/api\/communities\/\$\{communityId\}\/members/);
  assert.match(communityChatScreen, /uploadArrayBufferToBucket/);
  assert.doesNotMatch(communityChatScreen, /blob\(\)/);
  assert.match(communityChatScreen, /createSignedUrl/);
  assert.match(communityChatScreen, /message_type:\s*'TEXT'\s*\|\s*'IMAGE'\s*\|\s*'VIDEO'/);
  assert.match(communityChatScreen, /PATCH/);
  assert.match(communityChatScreen, /DELETE/);
});

test('profile screen exposes GDPR request actions', async () => {
  const profileScreen = await read('src/screens/profile/ProfileScreen.tsx');
  assert.match(profileScreen, /\/api\/privacy\/export/);
  assert.match(profileScreen, /\/api\/account\/delete/);
  assert.match(profileScreen, /Share\.share/);
  assert.match(profileScreen, /Supprimer mon compte/);
});

test('profile screen explains invisible mode eligibility and active behavior', async () => {
  const profileScreen = await read('src/screens/profile/ProfileScreen.tsx');
  assert.match(profileScreen, /toggleInvisibleMode/);
  assert.match(profileScreen, /decouverte standard/);
  assert.match(profileScreen, /6 mois et 1 an/);
  assert.match(profileScreen, /formule Premium actuelle n inclut pas le mode invisible/);
});

test('app context registers push tokens for authenticated users', async () => {
  const appContext = await read('src/state/AppContext.tsx');
  assert.match(appContext, /expo-notifications/);
  assert.match(appContext, /getExpoPushTokenAsync/);
  assert.match(appContext, /from\('push_tokens'\)\s*\.upsert/);
});

test('premium and boost screens use backend monetization endpoints', async () => {
  const premiumScreen = await read('src/screens/premium/PremiumScreen.tsx');
  const boostScreen = await read('src/screens/boost/BoostScreen.tsx');
  const likesReceivedScreen = await read('src/screens/premium/LikesReceivedScreen.tsx');
  const homeScreen = await read('src/screens/home/HomeScreen.tsx');

  assert.match(premiumScreen, /\/api\/payments\/initialize/);
  assert.match(premiumScreen, /\/api\/payments\/verify/);
  assert.match(boostScreen, /\/api\/boosts\/initialize/);
  assert.match(boostScreen, /\/api\/boosts\/verify/);
  assert.match(likesReceivedScreen, /\/api\/premium\/likes-received/);
  assert.match(likesReceivedScreen, /Super Like prioritaire/);
  assert.match(homeScreen, /\/api\/likes\/quota/);
});

test('admin dashboard, messaging and navigator expose back-office workflows', async () => {
  const navigator = await read('src/navigation/MainNavigator.tsx');
  const dashboard = await read('src/screens/admin/AdminDashboardScreen.tsx');
  const adminMessaging = await read('src/screens/admin/AdminMessagingScreen.tsx');
  const messagesScreen = await read('src/screens/messages/MessagesScreen.tsx');

  assert.match(navigator, /AdminModerationScreen/);
  assert.match(navigator, /AdminKycScreen/);
  assert.match(navigator, /AdminAuditLogScreen/);
  assert.match(navigator, /AdminMessagingScreen/);
  assert.match(navigator, /name="AdminStack"/);
  assert.match(navigator, /name="AdminTabs"/);
  assert.match(navigator, /name="AdminModerationTab"/);
  assert.match(navigator, /name="AdminKycTab"/);
  assert.match(navigator, /name="AdminUsersTab"/);
  assert.match(navigator, /name="AdminDashboardTab"/);
  assert.match(navigator, /name="AdminAuditLogs"/);
  assert.match(navigator, /name="AdminMessaging"/);
  assert.match(navigator, /title:\s*'Dashboard'/);
  assert.match(navigator, /title:\s*'Utilisateurs'/);
  assert.match(navigator, /title:\s*'Modération'/);
  assert.match(navigator, /title:\s*'KYC'/);

  assert.match(dashboard, /route:\s*'AdminAuditLogs'/);
  assert.match(dashboard, /route:\s*'AdminMessaging'/);
  assert.match(dashboard, /navigation\.navigate\(shortcut\.route\)/);
  assert.doesNotMatch(dashboard, /route:\s*'AdminUserList'/);

  assert.match(adminMessaging, /\/api\/admin\/messages\/audience/);
  assert.match(adminMessaging, /\/api\/admin\/messages\/history/);
  assert.match(adminMessaging, /\/api\/admin\/messages\/broadcast/);

  assert.match(messagesScreen, /\/api\/notifications\/admin\?limit=5/);
  assert.match(messagesScreen, /\/api\/notifications\/admin\/\$\{notificationId\}\/read/);
  assert.match(messagesScreen, /\/api\/notifications\/admin\/read-all/);
});
