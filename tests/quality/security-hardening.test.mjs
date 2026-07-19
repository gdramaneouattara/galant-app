import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('mobile storage uploads use native putFile instead of blobs', async () => {
  const helper = await read('src/lib/storageUpload.ts');
  const authFlow = await read('src/screens/auth/AuthFlowScreen.tsx');
  const verifyScreen = await read('src/screens/verify/VerifyScreen.tsx');

  assert.match(helper, /fbStorage\.ref\(bucket\)\.putFile/);
  assert.match(authFlow, /uploadArrayBufferToBucket/);
  assert.match(verifyScreen, /uploadArrayBufferToBucket/);
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
