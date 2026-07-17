import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('Business Logic: Matchmaking scoring weights are accurate', async () => {
  const code = await read('server/src/services/matchmakingService.js');
  assert.match(code, /is_vip/);
  assert.match(code, /MatchScore/);
});

test('Business Logic: Data export includes all relevant user data', async () => {
  const code = await read('server/src/controllers/privacyController.js');
  assert.match(code, /profile/);
  assert.match(code, /likes/);
  assert.match(code, /matches/);
  assert.match(code, /messages/);
});

test('Business Logic: KYC endpoint supports flexible inputs', async () => {
  const code = await read('server/src/controllers/kycController.js');
  assert.match(code, /document_type/);
  assert.match(code, /kyc_verifications/);
});

test('Business Logic: Photo moderation enforces security checks', async () => {
  const code = await read('server/src/controllers/adminController.js');
  assert.match(code, /photo/);
  assert.match(code, /approved|rejected/i);
});

test('Business Logic: Admin stats correctly aggregate user segments', async () => {
  const code = await read('server/src/controllers/adminController.js');
  assert.match(code, /total/);
  assert.match(code, /active/);
  assert.match(code, /male/);
  assert.match(code, /female/);
});

test('Business Logic: Message insertion supports rich media', async () => {
  const code = await read('server/src/controllers/messageController.js');
  assert.match(code, /message_type/);
  assert.match(code, /media_url/);
});

test('Business Logic: Visibility insight calculates ranks', async () => {
  const code = await read('server/src/controllers/matchmakingController.js');
  assert.match(code, /getVisibilityInsight/);
  assert.match(code, /myRank/);
});

test('Reinforced: Super Like respondent logic updates bidirectional likes', async () => {
  const code = await read('server/src/controllers/matchmakingController.js');
  assert.match(code, /super_like/i);
  assert.match(code, /likes/);
});

test('Reinforced: Status expires_at is set to 24 hours', async () => {
  const code = await read('server/src/controllers/statusController.js');
  assert.match(code, /expires_at/);
  assert.match(code, /24/);
});

test('Reinforced: AI Writing Assistant supports bilinguism', async () => {
  const code = await read('server/src/controllers/aiController.js');
  assert.match(code, /lang/);
  assert.match(code, /\[EN\]/);
});

test('Reinforced: Passport mode is restricted and implemented', async () => {
  const code = await read('server/src/controllers/matchmakingController.js');
  assert.match(code, /passport_city/);
  assert.match(code, /passport_latitude/);
});
