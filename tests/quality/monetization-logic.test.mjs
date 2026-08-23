import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('Monetization: Super Like unit price is 500 FCFA', async () => {
  const code = await read('server/src/config/constants.js');
  assert.match(code, /SUPER_LIKE:/);
  assert.match(code, /500/);
});

test('Monetization: Direct Message unit price is 500 FCFA', async () => {
  const code = await read('server/src/config/constants.js');
  assert.match(code, /DIRECT_MESSAGE:/);
  assert.match(code, /500/);
});

test('Monetization: Boost 1 Day price is 1000 FCFA', async () => {
  const code = await read('server/src/config/constants.js');
  assert.match(code, /BOOST_1D:/);
  assert.match(code, /1000/);
});

test('Monetization: Boost 3 Days price is 2500 FCFA', async () => {
  const code = await read('server/src/config/constants.js');
  assert.match(code, /BOOST_3D:/);
  assert.match(code, /2500/);
});

test('Monetization: Boost 7 Days price is 5000 FCFA', async () => {
  const code = await read('server/src/config/constants.js');
  assert.match(code, /BOOST_7D:/);
  assert.match(code, /5000/);
});

test('Admin pricing exposes boost tariff controls', async () => {
  const page = await read('web/src/pages/admin/AdminPricing.tsx');
  assert.match(page, /Boosts/);
  assert.match(page, /BOOST_1D/);
  assert.match(page, /BOOST_3D/);
  assert.match(page, /BOOST_7D/);
});

test('Boost purchase screens use configured pricing', async () => {
  const routes = await read('server/src/routes/paymentRoutes.js');
  const controller = await read('server/src/controllers/paymentController.js');
  const store = await read('web/src/pages/StorePage.tsx');
  const boostScreen = await read('src/screens/boost/BoostScreen.tsx');

  assert.match(routes, /router\.get\(['"]\/pricing['"],\s*requireAuth,\s*getPaymentPricing\)/);
  assert.match(controller, /const getPaymentPricing/);
  assert.match(controller, /getCurrentPricing\(\)/);
  assert.match(store, /\/api\/payments\/pricing/);
  assert.match(store, /getPrice\(['"]BOOST_1D['"],\s*1000\)/);
  assert.match(store, /getPrice\(['"]BOOST_3D['"],\s*2500\)/);
  assert.match(store, /getPrice\(['"]BOOST_7D['"],\s*5000\)/);
  assert.match(boostScreen, /\/api\/payments\/pricing/);
  assert.match(boostScreen, /getBoostPrice\(['"]BOOST_1D['"],\s*1000\)/);
  assert.match(boostScreen, /getBoostPrice\(['"]BOOST_3D['"],\s*2500\)/);
  assert.match(boostScreen, /getBoostPrice\(['"]BOOST_7D['"],\s*5000\)/);
});

test('Monetization: Women premium Super Like quota is 10/day', async () => {
  const code = await read('server/src/config/constants.js');
  assert.match(code, /WOMEN_SUPER_LIKE:\s*10/);
});

test('Monetization: Men 3M invisible views quota is 20/day', async () => {
  const code = await read('server/src/config/constants.js');
  assert.match(code, /MEN_3M_INVISIBLE_VIEWS:\s*20/);
});

test('Monetization: Men 3M status views quota is 20/day', async () => {
  const code = await read('server/src/config/constants.js');
  assert.match(code, /MEN_3M_STATUS_VIEWS:\s*20/);
});

test('Monetization: Daily boost quota is 1 hour', async () => {
  const code = await read('server/src/config/constants.js');
  assert.match(code, /DAILY_BOOST_SECONDS:\s*3600/);
});

test('Monetization: Men 3M stealth mode quota is 2 hours', async () => {
  const code = await read('server/src/config/constants.js');
  assert.match(code, /MEN_3M_HIDE_SEEN_SECONDS:\s*7200/);
});

test('Monetization: Subscription plan durations are correct', async () => {
  const code = await read('server/src/config/constants.js');
  assert.match(code, /MONTHLY:\s*30/);
  assert.match(code, /QUARTERLY:\s*90/);
  assert.match(code, /VISIBILITY:\s*30/);
  assert.match(code, /PRESTIGE:\s*30/);
});

test('Monetization: Partner plans are present', async () => {
  const code = await read('server/src/config/constants.js');
  assert.match(code, /PARTNER_VISIBILITY_AMOUNT/);
  assert.match(code, /PARTNER_PRESTIGE_AMOUNT/);
});

test('Monetization: all web purchase types map to backend prices', async () => {
  const hook = await read('src/hooks/useSubscription.ts');
  const helpers = await read('server/src/utils/paymentHelpers.js');

  assert.match(hook, /DISCOVER_GRID_UNLOCK/);
  assert.match(hook, /PARTNER_PREMIUM/);
  assert.match(helpers, /DISCOVER_GRID_UNLOCK/);
  assert.match(helpers, /PARTNER_DISCOVERY_UNLOCK/);
  assert.match(helpers, /PARTNER_PLAN_AMOUNTS\[normalizedPlanId\]/);
});

test('Payments: all payment handlers are exported and routed', async () => {
  const controller = await read('server/src/controllers/paymentController.js');
  const routes = await read('server/src/routes/paymentRoutes.js');

  assert.match(controller, /module\.exports\s*=\s*\{[^}]*getPaymentPricing[^}]*initializePayment[^}]*verifyPayment[^}]*googleVerify[^}]*appleVerify[^}]*handleWebhook[^}]*\}/s);
  assert.match(routes, /router\.post\(['"]\/initialize['"],\s*requireAuth,\s*initializePayment\)/);
  assert.match(routes, /router\.get\(['"]\/verify['"],\s*requireAuth,\s*verifyPayment\)/);
  assert.match(routes, /router\.post\(['"]\/google-verify['"],\s*requireAuth,\s*googleVerify\)/);
  assert.match(routes, /router\.post\(['"]\/apple-verify['"],\s*requireAuth,\s*appleVerify\)/);
  assert.match(routes, /router\.post\(['"]\/webhook['"],\s*handleWebhook\)/);
});

test('Payments: Paystack supports card and mobile money channels', async () => {
  const controller = await read('server/src/controllers/paymentController.js');
  const hook = await read('src/hooks/useSubscription.ts');

  assert.match(controller, /CARD_MOBILE_MONEY/);
  assert.match(controller, /payload\.channels\s*=\s*\['card'\]/);
  assert.match(controller, /payload\.channels\s*=\s*\['mobile_money'\]/);
  assert.match(controller, /payload\.channels\s*=\s*\['card',\s*'mobile_money'\]/);
  assert.match(hook, /PaystackPaymentMethod/);
  assert.match(hook, /CARD_MOBILE_MONEY/);
});

test('Payments: web Paystack returns are verified after checkout', async () => {
  const hook = await read('src/hooks/useSubscription.ts');
  const app = await read('web/src/App.tsx');
  const returnPage = await read('web/src/pages/PaymentReturnPage.tsx');
  const controller = await read('server/src/controllers/paymentController.js');
  const authContext = await read('web/src/context/AuthContext.tsx');
  const subscriptionService = await read('server/src/services/subscriptionService.js');

  assert.match(hook, /callbackUrl/);
  assert.match(hook, /\/payment-return/);
  assert.match(hook, /next=/);
  assert.match(controller, /callbackUrl/);
  assert.match(controller, /requestOrigin/);
  assert.match(controller, /callback_url:\s*PAYSTACK_CALLBACK_URL/);
  assert.match(app, /path="\/payment-return"/);
  assert.match(returnPage, /\/api\/payments\/verify\?reference=/);
  assert.match(returnPage, /reloadUser/);
  assert.match(returnPage, /await reloadUser\(\)/);
  assert.match(authContext, /getDoc\(doc\(db,\s*COLLECTIONS\.PROFILES/);
  assert.match(authContext, /setProfile\(\{\s*id:\s*profileDoc\.id/);
  assert.match(subscriptionService, /normalizedType === 'ROSE_PACK'/);
  assert.match(subscriptionService, /db\.runTransaction/);
  assert.match(subscriptionService, /payment_\$\{safeReference\}/);
  assert.match(subscriptionService, /rose_balance:\s*FieldValue\.increment\(quantity\)/);
});
