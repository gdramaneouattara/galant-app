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
  const notificationCenterService = await read('server/src/services/notificationCenterService.js');
  const notificationService = await read('server/src/services/notificationService.js');
  const subscriptionService = await read('server/src/services/subscriptionService.js');
  const routes = await read('server/src/routes/paymentRoutes.js');
  const adminRoutes = await read('server/src/routes/adminRoutes.js');
  const envExample = await read('server/.env.example');
  const firestoreIndexes = await read('firestore.indexes.json');
  const firebaseConfig = await read('firebase.json');
  const serverDeployWorkflow = await read('.github/workflows/deploy-server.yml');

  assert.match(controller, /createWaveManualPayment/);
  assert.match(controller, /submitWaveManualPaymentProof/);
  assert.match(controller, /status:\s*'PENDING'/);
  assert.match(controller, /status:\s*'SUBMITTED'/);
  assert.match(controller, /!payerPhone/);
  assert.match(controller, /payer_phone:\s*payerPhone/);
  assert.match(controller, /wave_transaction_already_used/);
  assert.match(controller, /MANUAL_PAYMENT_TRANSACTION_CLAIMS_COLLECTION/);
  assert.match(controller, /hashFirestoreId/);
  assert.match(controller, /createHash\('sha256'\)/);
  assert.match(controller, /db\.runTransaction/);
  assert.match(controller, /manual_payment_processing/);
  assert.match(controller, /isManualPaymentProcessingStale/);
  assert.match(controller, /ENTITLEMENT_APPLIED/);
  assert.match(controller, /approval_error/);
  assert.match(controller, /createApprovalLeaseId/);
  assert.match(controller, /approval_lease_id/);
  assert.match(controller, /manual_payment_approval_lease_lost/);
  assert.match(controller, /missing_wave_payer_phone/);
  assert.match(controller, /NOTIFICATION_TYPES\.PAYMENT_FAILED/);
  assert.match(controller, /payment_failed_/);
  assert.match(controller, /await createPaymentNotificationSafely/);
  assert.match(controller, /sendPush:\s*true/);
  assert.match(controller, /awaitPush:\s*true/);
  assert.match(notificationCenterService, /PUSH_WAIT_TIMEOUT_MS\s*=\s*2500/);
  assert.match(notificationCenterService, /Promise\.race/);
  assert.match(notificationService, /EXPO_PUSH_TIMEOUT_MS\s*=\s*5000/);
  assert.match(notificationService, /timeout:\s*EXPO_PUSH_TIMEOUT_MS/);
  assert.match(controller, /fetchManualPaymentsByStatus/);
  assert.match(controller, /\.where\('status',\s*'==',\s*itemStatus\)/);
  assert.match(controller, /\.where\('status',\s*'==',\s*itemStatus\)\s*\n\s*\.orderBy\('created_at',\s*'asc'\)\s*\n\s*\.limit\(queryLimit\)/);
  assert.doesNotMatch(controller, /\.where\('status',\s*'==',\s*itemStatus\)\s*\n\s*\.limit\(queryLimit\)\s*\n\s*\.get\(\)/);
  assert.doesNotMatch(controller, /manual_payments_index_not_ready/);
  assert.match(firestoreIndexes, /"collectionGroup":\s*"manual_payments"/);
  assert.match(firestoreIndexes, /"fieldPath":\s*"status"[\s\S]*"order":\s*"ASCENDING"/);
  assert.match(firestoreIndexes, /"fieldPath":\s*"created_at"[\s\S]*"order":\s*"ASCENDING"/);
  assert.match(firebaseConfig, /"indexes":\s*"firestore\.indexes\.json"/);
  assert.match(serverDeployWorkflow, /firestore\.indexes\.json/);
  assert.match(serverDeployWorkflow, /deploy --only firestore:indexes/);
  assert.match(serverDeployWorkflow, /Wait for Firestore indexes/);
  assert.match(serverDeployWorkflow, /manual_payments/);
  assert.match(controller, /applyPurchasedEntitlement\(/);
  assert.match(controller, /paymentMethod:\s*WAVE_PROVIDER/);
  assert.match(subscriptionService, /runEntitlementOnce/);
  assert.match(subscriptionService, /paymentLedgerId/);
  assert.match(subscriptionService, /createHash\('sha256'\)/);
  assert.match(subscriptionService, /alreadyProcessed/);
  assert.match(routes, /\/wave\/manual-intent/);
  assert.match(routes, /\/wave\/manual-proof/);
  assert.match(adminRoutes, /\/payments\/wave/);
  assert.match(adminRoutes, /approveWaveManualPayment/);
  assert.match(adminRoutes, /rejectWaveManualPayment/);
  assert.match(envExample, /WAVE_PAYMENT_LINK/);
  assert.match(envExample, /WAVE_MANUAL_PAYMENT_EXPIRES_MINUTES/);
});

test('Payments: web Store exposes Wave payment flow without screenshots', async () => {
  const hook = await read('src/hooks/useSubscription.ts');
  const store = await read('web/src/pages/StorePage.tsx');
  const modal = await read('web/src/components/WaveManualPaymentModal.tsx');
  const finances = await read('web/src/pages/admin/AdminFinances.tsx');

  assert.match(hook, /createWaveManualPayment/);
  assert.match(hook, /submitWaveManualProof/);
  assert.doesNotMatch(store, /paymentMode/);
  assert.doesNotMatch(store, /purchaseWithPaystack/);
  assert.match(store, /WaveManualPaymentModal/);
  assert.match(store, /createWaveManualPayment\(type,\s*amount/);
  assert.match(modal, /transactionId/);
  assert.match(modal, /reference_code/);
  assert.match(modal, /!phone\.trim\(\)/);
  assert.doesNotMatch(modal, /phoneOptional/);
  assert.doesNotMatch(modal, /screenshot|capture/i);
  assert.match(finances, /Paiements Wave a verifier/);
  assert.match(finances, /Paiements prets a verifier/);
  assert.match(finances, /Paiements incomplets/);
  assert.match(finances, /hasWaveProof/);
  assert.match(finances, /sortOldestFirst/);
  assert.match(finances, /!isReady/);
  assert.doesNotMatch(finances, /payment\.payer_phone \|\| payment\.profile\?\.phone/);
  assert.match(finances, /Valider/);
  assert.match(finances, /Rejeter/);
});

test('Payments: Cloud Run deploy disables Paystack and uses Wave manual secrets', async () => {
  const workflow = await read('.github/workflows/deploy-server.yml');

  assert.doesNotMatch(workflow, /PAYSTACK_SECRET_KEY=PAYSTACK_SECRET_KEY:latest/);
  assert.match(workflow, /PAYSTACK_ENABLED=false/);
  assert.match(workflow, /--remove-secrets PAYSTACK_SECRET_KEY/);
  assert.match(workflow, /--update-secrets/);
  assert.match(workflow, /WAVE_PAYMENT_LINK=WAVE_PAYMENT_LINK:latest/);
  assert.match(workflow, /WAVE_RECEIVER_PHONE=WAVE_RECEIVER_PHONE:latest/);
});

test('Payments: Paystack checkout is disabled while Wave mode is active', async () => {
  const controller = await read('server/src/controllers/paymentController.js');
  const interactionModal = await read('web/src/components/InteractionPurchaseModal.tsx');
  const stories = await read('web/src/pages/StoriesPage.tsx');
  const hook = await read('src/hooks/useSubscription.ts');

  assert.match(controller, /isPaystackInitializationEnabled/);
  assert.match(controller, /paystack_disabled/);
  assert.match(controller, /PAYSTACK_ENABLED/);
  assert.match(hook, /PAYSTACK_TEMPORARILY_DISABLED\s*=\s*true/);
  assert.doesNotMatch(interactionModal, /purchaseWithPaystack/);
  assert.match(interactionModal, /createWaveManualPayment/);
  assert.doesNotMatch(stories, /purchaseWithPaystack/);
  assert.match(stories, /WaveManualPaymentModal/);
});

test('Payments: legacy Paystack return route stays non-authoritative while checkout is disabled', async () => {
  const hook = await read('src/hooks/useSubscription.ts');
  const app = await read('web/src/App.tsx');
  const returnPage = await read('web/src/pages/PaymentReturnPage.tsx');
  const controller = await read('server/src/controllers/paymentController.js');

  assert.match(hook, /callbackUrl/);
  assert.match(hook, /\/payment-return/);
  assert.match(hook, /next=/);
  assert.match(controller, /paystackDisabledPayload/);
  assert.match(controller, /return res\.status\(410\)\.json\(paystackDisabledPayload\)/);
  assert.match(controller, /hasPaystackSecret/);
  assert.match(controller, /return res\.status\(503\)\.json\(paystackUnavailablePayload\)/);
  assert.match(controller, /return res\.sendStatus\(503\)/);
  assert.match(controller, /callbackUrl/);
  assert.match(controller, /requestOrigin/);
  assert.match(controller, /callback_url:\s*PAYSTACK_CALLBACK_URL/);
  assert.match(app, /path="\/payment-return"/);
  assert.match(returnPage, /\/api\/payments\/verify\?reference=/);
});
