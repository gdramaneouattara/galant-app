import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('Monetization: Super Like unit price is 500 FCFA', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /SUPER_LIKE:/);
  assert.match(code, /SUPER_LIKE_AMOUNT/);
  assert.match(code, /'500'/);
});

test('Monetization: Direct Message unit price is 200 FCFA', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /DIRECT_MESSAGE:/);
  assert.match(code, /DIRECT_MESSAGE_AMOUNT/);
  assert.match(code, /'200'/);
});

test('Monetization: Boost 1 Day price is 1000 FCFA', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /BOOST_1D:/);
  assert.match(code, /BOOST_1D_AMOUNT/);
  assert.match(code, /'1000'/);
});

test('Monetization: Boost 3 Days price is 2500 FCFA', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /BOOST_3D:/);
  assert.match(code, /BOOST_3D_AMOUNT/);
  assert.match(code, /'2500'/);
});

test('Monetization: Boost 7 Days price is 5000 FCFA', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /BOOST_7D:/);
  assert.match(code, /BOOST_7D_AMOUNT/);
  assert.match(code, /'5000'/);
});

test('Monetization: Women premium Super Like quota is 10/day', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /WOMEN_SUPER_LIKE:\s*10/);
});

test('Monetization: Men 3M invisible views quota is 20/day', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /MEN_3M_INVISIBLE_VIEWS:\s*20/);
});

test('Monetization: Men 3M status views quota is 20/day', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /MEN_3M_STATUS_VIEWS:\s*20/);
});

test('Monetization: Daily boost quota is 1 hour', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /DAILY_BOOST_SECONDS:\s*3600/);
});

test('Monetization: Men 3M stealth mode quota is 2 hours', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /MEN_3M_HIDE_SEEN_SECONDS:\s*7200/);
});

test('Monetization: Subscription plan durations are correct', async () => {
  const code = await read('server/src/index.js');
  assert.match(code, /MONTHLY:\s*30/);
  assert.match(code, /QUARTERLY:\s*90/);
  assert.match(code, /BIANNUAL:\s*180/);
  assert.match(code, /ANNUAL:\s*365/);
});
