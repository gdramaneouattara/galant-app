const { db } = require('../config/firebase');
const axios = require('axios');

/**
 * Scraper logic for Phase 1.
 * Fetches or simulates market data and saves to DB.
 */
const scrapeProductIfNeeded = async (query) => {
  console.log(`[SCRAPER] Investigating market for: ${query}`);

  try {
    // 1. Check if we already have many results for this exact query recently
    const existing = await db.collection('market_products')
      .where('keywords', 'array-contains', query)
      .limit(5)
      .get();

    if (existing.size >= 5) {
      console.log(`[SCRAPER] Already have enough data for ${query}`);
      return existing.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // 2. Perform Scraping (Simulated for now with diverse results)
    const keywords = query.split(/\s+/).filter(w => w.length > 2);
    const now = new Date().toISOString();

    const brands = ['Samsung', 'LG', 'Sony', 'Hisense', 'TCL'];
    const priceBase = query.includes('télé') || query.includes('tv') ? 150000 : 50000;

    const newResults = [
      {
        name: `${brands[Math.floor(Math.random() * brands.length)]} ${query.toUpperCase()} - Crystal Clear`,
        current_price: priceBase + Math.floor(Math.random() * 100000),
        currency: 'XOF',
        image_url: 'https://placehold.co/400x400?text=TV+Elite',
        source_url: 'https://jumia.ci/search?q=' + encodeURIComponent(query),
        keywords: [query, ...keywords],
        last_scraped_at: now
      },
      {
        name: `${query.toUpperCase()} Smart Series 2024`,
        current_price: priceBase - 20000 + Math.floor(Math.random() * 50000),
        currency: 'XOF',
        image_url: 'https://placehold.co/400x400?text=Smart+Choice',
        source_url: 'https://example.com/market',
        keywords: [query, ...keywords],
        last_scraped_at: now
      }
    ];

    const savedResults = [];
    for (const p of newResults) {
      const docRef = await db.collection('market_products').add(p);
      savedResults.push({ id: docRef.id, ...p });
    }

    console.log(`[SCRAPER] Found and saved ${newResults.length} new results for ${query}`);
    return savedResults;
  } catch (error) {
    console.error('[SCRAPER ERROR]', error.message);
    return [];
  }
};

module.exports = { scrapeProductIfNeeded };
