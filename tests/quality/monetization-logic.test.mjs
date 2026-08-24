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

test('Payment initialization rejects stale displayed prices', async () => {
  const controller = await read('server/src/controllers/paymentController.js');
  const helpers = await read('server/src/utils/paymentHelpers.js');
  const pricingService = await read('server/src/services/pricingService.js');
  const adminController = await read('server/src/controllers/adminController.js');
  const boostedProfile = await read('src/screens/profile/BoostedProfileDetailScreen.tsx');
  const superLikeModal = await read('src/components/SuperLikePurchaseModal.tsx');
  const directMessageModal = await read('src/components/DirectMessagePurchaseModal.tsx');

  assert.match(controller, /const \{ planId, type, targetId, paymentMethod, note, callbackUrl, amount \} = req\.body/);
  assert.match(controller, /forceRefresh:\s*true/);
  assert.match(controller, /amount === undefined \|\| amount === null/);
  assert.match(controller, /error:\s*['"]missing_quoted_amount['"]/);
  assert.match(controller, /displayedAmount/);
  assert.match(controller, /normalizedDisplayedAmount !== normalizedExpectedAmount/);
  assert.match(controller, /res\.status\(409\)\.json\(\{/);
  assert.match(controller, /error:\s*['"]price_changed['"]/);
  assert.match(controller, /expected_amount/);
  assert.match(controller, /quotedAmount/);
  assert.match(helpers, /getCurrentPricing\(\{\s*forceRefresh\s*\}\)/);
  assert.match(pricingService, /forceRefresh = false/);
  assert.match(pricingService, /if \(cachedPricing\) \{\s*return cachedPricing;\s*\}/s);
  assert.match(pricingService, /const clearPricingCache/);
  assert.match(adminController, /clearPricingCache\(\)/);
  assert.match(boostedProfile, /\/api\/payments\/pricing/);
  assert.match(boostedProfile, /superLikePrice/);
  assert.match(boostedProfile, /directMessagePrice/);
  assert.match(boostedProfile, /body:\s*JSON\.stringify\(\{ type, targetId, amount, paymentMethod: ['"]MOBILE_MONEY['"] \}\)/);
  assert.match(superLikeModal, /priceAmount = SUPER_LIKE_PRICE/);
  assert.match(directMessageModal, /priceAmount = DM_PRICE/);
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
  assert.match(helpers, /DISCOVER_FILTERS_UNLOCK/);
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

test('Payments: Wave manual orders stay pending until admin validation', async () => {
  const controller = await read('server/src/controllers/paymentController.js');
  const routes = await read('server/src/routes/paymentRoutes.js');
  const adminRoutes = await read('server/src/routes/adminRoutes.js');
  const envExample = await read('server/.env.example');

  assert.match(controller, /createWaveManualPayment/);
  assert.match(controller, /submitWaveManualPaymentProof/);
  assert.match(controller, /status:\s*'PENDING'/);
  assert.match(controller, /status:\s*'SUBMITTED'/);
  assert.match(controller, /!payerPhone/);
  assert.match(controller, /payer_phone:\s*payerPhone/);
  assert.match(controller, /wave_transaction_already_used/);
  assert.match(controller, /applyPurchasedEntitlement\(/);
  assert.match(controller, /paymentMethod:\s*WAVE_PROVIDER/);
  assert.match(routes, /\/wave\/manual-intent/);
  assert.match(routes, /\/wave\/manual-proof/);
  assert.match(adminRoutes, /\/payments\/wave/);
  assert.match(adminRoutes, /approveWaveManualPayment/);
  assert.match(adminRoutes, /rejectWaveManualPayment/);
  assert.match(envExample, /WAVE_PAYMENT_LINK/);
  assert.match(envExample, /WAVE_MANUAL_PAYMENT_EXPIRES_MINUTES/);
});

test('Payments: web Store exposes Wave manual payment flow without screenshots', async () => {
  const hook = await read('src/hooks/useSubscription.ts');
  const store = await read('web/src/pages/StorePage.tsx');
  const modal = await read('web/src/components/WaveManualPaymentModal.tsx');
  const finances = await read('web/src/pages/admin/AdminFinances.tsx');

  assert.match(hook, /createWaveManualPayment/);
  assert.match(hook, /submitWaveManualProof/);
  assert.match(store, /paymentMode/);
  assert.match(store, /useState<'PAYSTACK' \| 'WAVE'>\('WAVE'\)/);
  assert.match(store, /WaveManualPaymentModal/);
  assert.match(store, /createWaveManualPayment\(type,\s*amount/);
  assert.match(modal, /transactionId/);
  assert.match(modal, /reference_code/);
  assert.match(modal, /!phone\.trim\(\)/);
  assert.doesNotMatch(modal, /phoneOptional/);
  assert.doesNotMatch(modal, /screenshot|capture/i);
  assert.match(finances, /Paiements Wave a verifier/);
  assert.match(finances, /Valider/);
  assert.match(finances, /Rejeter/);
});

test('Payments: Cloud Run deploy does not require disabled Paystack secret for Wave manual mode', async () => {
  const workflow = await read('.github/workflows/deploy-server.yml');

  assert.doesNotMatch(workflow, /PAYSTACK_SECRET_KEY=PAYSTACK_SECRET_KEY:latest/);
  assert.match(workflow, /--remove-secrets PAYSTACK_SECRET_KEY/);
  assert.match(workflow, /--update-secrets/);
  assert.match(workflow, /WAVE_PAYMENT_LINK=WAVE_PAYMENT_LINK:latest/);
  assert.match(workflow, /WAVE_RECEIVER_PHONE=WAVE_RECEIVER_PHONE:latest/);
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
