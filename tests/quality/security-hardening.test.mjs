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
  assert.match(webChat, /preload="none"/);
  assert.match(webChat, /poster=/);
  assert.match(webVideo, /MediaRecorder/);
  assert.match(webVideo, /VIDEO_UPLOAD_MAX_BYTES\s*=\s*30\s*\*\s*1024\s*\*\s*1024/);
  assert.match(storageRules, /match \/chat-media\/\{userId\}/);
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
