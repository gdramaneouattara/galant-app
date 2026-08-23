const { db } = require('../config/firebase');
const constants = require('../config/constants');

let cachedPricing = null;
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const mergeRosePacks = (overrides = {}) => {
  const merged = {};
  const keys = new Set([...Object.keys(constants.ROSE_PACKS), ...Object.keys(overrides || {})]);
  keys.forEach((key) => {
    merged[key] = {
      ...(constants.ROSE_PACKS[key] || {}),
      ...(overrides?.[key] || {})
    };
  });
  return merged;
};

/**
 * Gets the current pricing, with fallback to constants.
 */
const getCurrentPricing = async ({ forceRefresh = false } = {}) => {
  const now = Date.now();
  if (!forceRefresh && cachedPricing && (now - lastFetch < CACHE_TTL)) {
    return cachedPricing;
  }

  try {
    const doc = await db.collection('app_settings').doc('pricing').get();
    if (doc.exists) {
      const data = doc.data() || {};
      cachedPricing = {
        PRICES: { ...constants.PRICES, ...(data.PRICES || {}) },
        PLAN_AMOUNTS: { ...constants.PLAN_AMOUNTS, ...(data.PLAN_AMOUNTS || {}) },
        PARTNER_PLAN_AMOUNTS: { ...constants.PARTNER_PLAN_AMOUNTS, ...(data.PARTNER_PLAN_AMOUNTS || {}) },
        ROSE_PACKS: mergeRosePacks(data.ROSE_PACKS)
      };
    } else {
      cachedPricing = {
        PRICES: constants.PRICES,
        PLAN_AMOUNTS: constants.PLAN_AMOUNTS,
        PARTNER_PLAN_AMOUNTS: constants.PARTNER_PLAN_AMOUNTS,
        ROSE_PACKS: constants.ROSE_PACKS
      };
    }
    lastFetch = now;
    return cachedPricing;
  } catch (error) {
    console.error('Error fetching pricing from Firestore:', error);
    return {
      PRICES: constants.PRICES,
      PLAN_AMOUNTS: constants.PLAN_AMOUNTS,
      PARTNER_PLAN_AMOUNTS: constants.PARTNER_PLAN_AMOUNTS,
      ROSE_PACKS: constants.ROSE_PACKS
    };
  }
};

const clearPricingCache = () => {
  cachedPricing = null;
  lastFetch = 0;
};

module.exports = { getCurrentPricing, clearPricingCache };
