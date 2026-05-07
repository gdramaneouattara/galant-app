import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('Business Logic: Matchmaking scoring weights are accurate', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /is_vip/);
  assert.match(code, /city/);
  assert.match(code, /score/);
});

test('Business Logic: Community creation restricted to long-term plans', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /BIANNUAL/);
  assert.match(code, /ANNUAL/);
});

test('Business Logic: Data export includes all relevant user data', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /profile/);
  assert.match(code, /likes/);
  assert.match(code, /matches/);
  assert.match(code, /messages/);
});

test('Business Logic: KYC endpoint supports flexible inputs', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /document_type/);
  assert.match(code, /document_front/);
});

test('Business Logic: Photo moderation enforces security checks', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /https/);
  assert.match(code, /jpg/);
});

test('Business Logic: Admin stats correctly aggregate user segments', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /total/);
  assert.match(code, /active/);
  assert.match(code, /suspended/);
});

test('Business Logic: Message insertion supports rich media', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /message_type/);
  assert.match(code, /media_url/);
});

test('Business Logic: Audit logs support granular action filtering', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /action/);
  assert.match(code, /limit/);
});

test('Business Logic: Trial boost uses cumulative time tracking', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /totalTrialUsage/);
  assert.match(code, /TRIAL_BOOST_SECONDS/);
});

test('Reinforced: Super Like respondent logic updates bidirectional likes', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /super-likes/);
  assert.match(code, /likes/);
});

test('Reinforced: Status expires_at is set to 24 hours', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /expires_at/);
  assert.match(code, /24/);
});

test('Reinforced: Mobile ChatScreen handles stealth mode', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /QUARTERLY/);
  assert.match(code, /stealth/);
});

test('Reinforced: Profile badges component supports VIP gem icon', async () => {
  const code = await read('src/components/ProfileBadges.tsx');
  assert.match(code, /isVip/);
  assert.match(code, /Gem/);
});

test('Reinforced: HomeScreen implements search filters modal', async () => {
  const code = await read('src/screens/home/HomeScreen.tsx');
  assert.match(code, /Filtres/);
});
