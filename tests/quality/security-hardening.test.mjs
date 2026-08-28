import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('mobile storage uploads use native putFile instead of blobs', async () => {
  const helper = await read('src/lib/storageUpload.ts');
  const authFlow = await read('src/screens/auth/AuthFlowScreen.tsx');
  const photosStep = await read('src/screens/auth/components/PhotosStep.tsx');
  const verifyScreen = await read('src/screens/verify/VerifyScreen.tsx');

  assert.match(helper, /putFile/);
  assert.match(helper, /ImageManipulator\.SaveFormat\.WEBP/);
  assert.match(helper, /IMAGE_MAX_WIDTH\s*=\s*900/);
  assert.match(authFlow, /uploadArrayBufferToBucket/);
  assert.match(photosStep, /base64:\s*false/);
  assert.match(verifyScreen, /uploadArrayBufferToBucket/);
});

test('galleries use economical image loading strategies', async () => {
  const nativeGrid = await read('src/screens/discover/DiscoverGridScreen.tsx');
  const webGrid = await read('web/src/pages/DiscoverGridPage.tsx');
  const webCompression = await read('web/src/lib/imageCompression.ts');

  assert.match(nativeGrid, /FlatList/);
  assert.match(nativeGrid, /initialNumToRender=\{8\}/);
  assert.match(nativeGrid, /removeClippedSubviews/);
  assert.match(webGrid, /OptimizedImage/);
  assert.match(webCompression, /DEFAULT_TARGET_BYTES\s*=\s*180\s*\*\s*1024/);
  assert.match(webCompression, /image\/webp/);
});

test('video uploads are bounded, compressed, and use persisted thumbnails', async () => {
  const mediaRoutes = await read('server/src/routes/mediaRoutes.js');
  const mediaController = await read('server/src/controllers/mediaController.js');
  const statusController = await read('server/src/controllers/statusController.js');
  const nativeStories = await read('src/screens/home/StatusScreen.tsx');
  const nativeChat = await read('src/screens/messages/ChatScreen.tsx');
  const nativeChatItem = await read('src/screens/messages/components/ChatMessageItem.tsx');
  const webStories = await read('web/src/pages/StoriesPage.tsx');
  const webChat = await read('web/src/pages/ChatPage.tsx');
  const webVideo = await read('web/src/lib/videoOptimization.ts');
  const storageRules = await read('storage.rules');

  assert.match(mediaRoutes, /MAX_VIDEO_UPLOAD_BYTES\s*=\s*30\s*\*\s*1024\s*\*\s*1024/);
  assert.match(mediaRoutes, /LIMIT_FILE_SIZE/);
  assert.match(mediaRoutes, /isAcceptedVideoUpload/);
  assert.match(mediaRoutes, /application\/octet-stream/);
  assert.match(mediaRoutes, /VIDEO_EXTENSIONS/);
  assert.match(mediaRoutes, /VIDEO_MIME_TYPES/);
  assert.match(mediaRoutes, /\.3gpp/);
  assert.doesNotMatch(mediaRoutes, /\.avi/);
  assert.doesNotMatch(mediaRoutes, /\.mkv/);
  assert.doesNotMatch(mediaRoutes, /startsWith\('video\/'\)\s*\)\s*return true/);
  assert.doesNotMatch(mediaRoutes, /video\/x-msvideo/);
  assert.doesNotMatch(mediaRoutes, /video\/x-matroska/);
  assert.match(mediaController, /validateOriginalVideo/);
  assert.match(mediaController, /validateCompressedVideo/);
  assert.match(mediaController, /createVideoValidationError/);
  assert.match(mediaController, /sanitizeVideoUploadError/);
  assert.match(mediaController, /VIDEO_CONTENT_TYPE_BY_EXTENSION/);
  assert.match(mediaController, /getSafeVideoContentType/);
  assert.match(mediaController, /video\/3gpp/);
  assert.match(mediaController, /isVideoValidationError/);
  assert.match(mediaController, /ffmpeg\.ffprobe/);
  assert.match(mediaController, /canUseOriginalFallback/);
  assert.match(mediaController, /hasFiniteDuration/);
  assert.match(mediaController, /invalid_video_duration/);
  assert.match(mediaController, /video_too_long/);
  assert.match(mediaController, /createVideoThumbnail/);
  assert.match(mediaController, /thumbnailUrl/);
  assert.match(mediaController, /scale=-2:540/);
  assert.match(statusController, /thumbnail_url/);
  assert.match(nativeStories, /videoExportPreset:\s*ImagePicker\.VideoExportPreset\.H264_960x540/);
  assert.match(nativeChat, /formData\.append\('type', 'CHAT'\)/);
  assert.match(nativeChat, /chat-media\/\$\{res\.mediaUrl\}/);
  assert.match(nativeChatItem, /videoOpen/);
  assert.match(webStories, /compressVideoWeb/);
  assert.match(webStories, /thumbnailUrl/);
  assert.match(webChat, /ensureVideoUploadFile/);
  assert.match(webChat, /inferVideoMimeType/);
  assert.match(webChat, /preload="none"/);
  assert.match(webChat, /poster=/);
  assert.match(webVideo, /MediaRecorder/);
  assert.match(webVideo, /VIDEO_UPLOAD_MAX_BYTES\s*=\s*30\s*\*\s*1024\s*\*\s*1024/);
  assert.match(storageRules, /match \/chat-media\/\{userId\}/);
});

test('vocal serenade supports one-listen playback across web and mobile', async () => {
  const messageController = await read('server/src/controllers/messageController.js');
  const webChat = await read('web/src/pages/ChatPage.tsx');
  const webVoicePlayer = await read('web/src/components/VoicePlayer.tsx');
  const nativeChat = await read('src/screens/messages/ChatScreen.tsx');
  const nativeInput = await read('src/screens/messages/components/ChatInput.tsx');
  const nativeMessage = await read('src/screens/messages/components/ChatMessageItem.tsx');

  assert.match(messageController, /venueChatId/);
  assert.match(messageController, /venue_messages\/\$\{venueChatId\}/);
  assert.match(messageController, /metadata\/played_at/);
  assert.match(messageController, /const isVoiceMessage = normalizedType === 'VOICE'/);
  assert.match(messageController, /hasPremiumVoiceAccess/);
  assert.match(messageController, /profile\?\.is_premium \|\| profile\?\.is_vip/);
  assert.match(messageController, /serenade_requires_premium/);
  assert.match(webChat, /VOICE_MAX_DURATION_SECONDS\s*=\s*30/);
  assert.match(webChat, /VOICE_UPLOAD_MAX_BYTES\s*=\s*2\s*\*\s*1024\s*\*\s*1024/);
  assert.match(webChat, /const requirePremiumMediaAccess = \(\) =>/);
  assert.match(webChat, /const handleVoiceUpload = async \(file: Blob\) => \{\s*if \(!requirePremiumMediaAccess\(\)\) return;/);
  assert.match(webChat, /const handleStartRec = async \(\) => \{\s*if \(!requirePremiumMediaAccess\(\)\) return;/);
  assert.match(webVoicePlayer, /body:\s*JSON\.stringify\(\{\s*matchId,\s*venueChatId\s*\}\)/s);
  assert.match(nativeChat, /Audio\.Recording\.createAsync/);
  assert.match(nativeChat, /messageType:\s*'VOICE'/);
  assert.match(nativeInput, /onToggleVoice/);
  assert.match(nativeMessage, /body:\s*JSON\.stringify\(\{\s*matchId,\s*venueChatId\s*\}\)/s);
});

test('partner direct access is paid and consistent across web and mobile', async () => {
  const venueController = await read('server/src/controllers/venueController.js');
  const messageController = await read('server/src/controllers/messageController.js');
  const webGuide = await read('web/src/pages/GuidePage.tsx');
  const webVenueDetail = await read('web/src/pages/VenueDetailPage.tsx');
  const nativeVenueDetail = await read('src/screens/guide/VenueDetailScreen.tsx');

  assert.match(venueController, /hasDirectMessagePurchase\(meId,\s*id\)/);
  assert.match(venueController, /payment_required/);
  assert.match(venueController, /FieldValue\.increment\(-1\)/);
  assert.match(venueController, /runTransaction/);
  assert.match(messageController, /hasDirectMessagePurchase\(me\.id,\s*venueId\)/);
  assert.match(messageController, /chat_not_authorized/);
  assert.match(webGuide, /InteractionPurchaseModal/);
  assert.match(webGuide, /event\.stopPropagation\(\)/);
  assert.match(webGuide, /handleNearbyGps/);
  assert.match(webGuide, /hasPartnerDiscoveryAccess/);
  assert.match(webGuide, /setPartnerDiscoveryUnlockOpen\(true\)/);
  assert.match(webGuide, /type="PARTNER_DISCOVERY_UNLOCK"/);
  assert.match(webGuide, /price=\{500\}/);
  assert.match(webVenueDetail, /venueChatId:\s*res\.venueChatId/);
  assert.match(webVenueDetail, /InteractionPurchaseModal/);
  assert.match(nativeVenueDetail, /DirectMessagePurchaseModal/);
  assert.match(nativeVenueDetail, /purchaseWithPaystack\('DIRECT_MESSAGE',\s*500,\s*venue\.id/);
});

test('media v2 uses optimized rendering and browser caching on high traffic surfaces', async () => {
  const webOptimizedImage = await read('web/src/components/OptimizedImage.tsx');
  const nativeOptimizedImage = await read('src/components/OptimizedImage.tsx');
  const viteConfig = await read('web/vite.config.ts');
  const webDiscover = await read('web/src/pages/DiscoverPage.tsx');
  const webGrid = await read('web/src/pages/DiscoverGridPage.tsx');
  const webChat = await read('web/src/pages/ChatPage.tsx');
  const webStories = await read('web/src/pages/StoriesPage.tsx');
  const nativeGrid = await read('src/screens/discover/DiscoverGridScreen.tsx');
  const nativeChat = await read('src/screens/messages/components/ChatMessageItem.tsx');
  const nativeMessages = await read('src/screens/messages/MessagesScreen.tsx');

  assert.match(webOptimizedImage, /loading=.*lazy/s);
  assert.match(webOptimizedImage, /decoding=.*async/s);
  assert.match(nativeOptimizedImage, /cache: 'force-cache'/);
  assert.match(nativeOptimizedImage, /resizeMethod="resize"/);
  assert.match(nativeOptimizedImage, /progressiveRenderingEnabled/);
  assert.match(viteConfig, /galant-media-cache/);
  assert.match(viteConfig, /maxEntries:\s*250/);
  assert.match(webDiscover, /OptimizedImage/);
  assert.match(webGrid, /OptimizedImage/);
  assert.match(webChat, /OptimizedImage/);
  assert.match(webStories, /OptimizedImage/);
  assert.match(nativeGrid, /OptimizedImage/);
  assert.match(nativeChat, /OptimizedImage/);
  assert.match(nativeMessages, /OptimizedImage/);
});

test('backend auth returns profile_not_found for missing profile', async () => {
  const server = await read('server/src/middleware/auth.js');
  assert.match(server, /profile_not_found/);
});

test('backend applies baseline transport and browser security controls', async () => {
  const server = await read('server/src/index.js');
  assert.match(server, /cors/);
});

test('web recovers from stale dynamic chunks after deployments', async () => {
  const main = await read('web/src/main.tsx');
  const recovery = await read('web/src/lib/chunkRecovery.ts');
  const index = await read('web/index.html');
  const viteConfig = await read('web/vite.config.ts');

  assert.match(main, /installChunkRecovery\(\)/);
  assert.match(main, /__GALANT_APP_BOOTED/);
  assert.match(main, /onNeedRefresh/);
  assert.match(recovery, /vite:preloadError/);
  assert.match(recovery, /Failed to fetch dynamically imported module/i);
  assert.match(recovery, /window\.location\.reload\(\)/);
  assert.match(recovery, /galant-media-cache/);
  assert.match(index, /galant-boot-loader/);
  assert.match(index, /galant_pwa_boot_recovery_at/);
  assert.match(index, /unregisterServiceWorkers/);
  assert.match(index, /getGalantServiceWorkerScope/);
  assert.match(index, /\/galant-app\//);
  assert.match(index, /registration\.scope === galantScope/);
  assert.match(index, /pwa_recover/);
  assert.match(viteConfig, /const pwaRoot/);
  assert.match(viteConfig, /start_url:\s*pwaRoot/);
  assert.match(viteConfig, /scope:\s*pwaRoot/);
  assert.match(viteConfig, /cleanupOutdatedCaches:\s*true/);
});

test('backend exposes internal KYC endpoints for user submission', async () => {
  const code = await read('server/src/routes/kycRoutes.js');
  assert.match(code, /\/requests/);
});

test('backend exposes matchmaking and swipe endpoints', async () => {
  const routes = await read('server/src/routes/matchmakingRoutes.js');
  assert.match(routes, /\/suggestions/);
  assert.match(routes, /\/swipe/);
});

test('backend persists left swipes', async () => {
  const ctrl = await read('server/src/controllers/matchmakingController.js');
  assert.match(ctrl, /direction === ['"]LEFT['"]/);
});

test('backend supports multiple boost plans', async () => {
  const config = await read('server/src/config/constants.js');
  assert.match(config, /BOOST_1D/);
  assert.match(config, /BOOST_3D/);
  assert.match(config, /BOOST_7D/);
  assert.match(config, /BOOST_SCORES/);
});
