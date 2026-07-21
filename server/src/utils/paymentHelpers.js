const { PLAN_AMOUNTS, PARTNER_PLAN_AMOUNTS, PRICES } = require('../config/constants');

const getExpectedAmountForPurchase = ({ type, planId }) => {
  const normalizedType = String(type || '').toUpperCase();
  const normalizedPlanId = String(planId || '').toUpperCase();

  if (normalizedType === 'PREMIUM') return PLAN_AMOUNTS[normalizedPlanId] ?? null;
  if (normalizedType === 'PARTNER_PREMIUM') return PARTNER_PLAN_AMOUNTS[normalizedPlanId] ?? null;
  if (normalizedType === 'BOOST') {
    if (normalizedPlanId === '7D') return PRICES.BOOST_7D;
    if (normalizedPlanId === '3D') return PRICES.BOOST_3D;
    if (normalizedPlanId === '1D') return PRICES.BOOST_1D;
    return null;
  }
  if (normalizedType === 'SUPER_LIKE') return PRICES.SUPER_LIKE;
  if (normalizedType === 'DIRECT_MESSAGE') return PRICES.DIRECT_MESSAGE;
  if (normalizedType === 'GOLDEN_ROSE') return PRICES.GOLDEN_ROSE;
  if (normalizedType === 'ROSE_NOTE_UNLOCK') return PRICES.ROSE_NOTE_UNLOCK;
  if (normalizedType === 'STORY_UPLOAD') return PRICES.STORY_UPLOAD;
  return null;
};

const extractPaystackError = (error) => {
  const payload = error?.response?.data;
  if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message.trim();
  if (typeof error?.message === 'string' && error.message.trim()) return error.message.trim();
  return 'paystack_init_failed';
};

const shouldFallbackFromMobileMoney = (error) => {
  const message = extractPaystackError(error).toLowerCase();
  return message.includes('mobile money') || message.includes('channel') || message.includes('not available') || message.includes('unsupported');
};

module.exports = { getExpectedAmountForPurchase, extractPaystackError, shouldFallbackFromMobileMoney };
