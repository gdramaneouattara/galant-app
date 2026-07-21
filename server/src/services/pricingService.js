const { db } = require('../config/firebase');
const constants = require('../config/constants');

let cachedPricing = null;
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Gets the current pricing, with fallback to constants.
 */
const getCurrentPricing = async () => {
  const now = Date.now();
  if (cachedPricing && (now - lastFetch < CACHE_TTL)) {
    return cachedPricing;
  }

  try {
    const doc = await db.collection('app_settings').doc('pricing').get();
    if (doc.exists) {
      cachedPricing = doc.data();
    } else {
      cachedPricing = {
        PRICES: constants.PRICES,
        PLAN_AMOUNTS: constants.PLAN_AMOUNTS,
        PARTNER_PLAN_AMOUNTS: constants.PARTNER_PLAN_AMOUNTS
      };
    }
    lastFetch = now;
    return cachedPricing;
  } catch (error) {
    console.error('Error fetching pricing from Firestore:', error);
    return {
      PRICES: constants.PRICES,
      PLAN_AMOUNTS: constants.PLAN_AMOUNTS,
      PARTNER_PLAN_AMOUNTS: constants.PARTNER_PLAN_AMOUNTS
    };
  }
};

module.exports = { getCurrentPricing };
