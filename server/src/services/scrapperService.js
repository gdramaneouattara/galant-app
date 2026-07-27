const { db } = require('../config/firebase');
const axios = require('axios');

/**
 * Mock scraper logic for Phase 1.
 * In a real scenario, this would use Puppeteer or a specialized API.
 */
const scrapeProductIfNeeded = async (query) => {
  console.log(`[SCRAPER] Investigating market for: ${query}`);

  // Anti-flood: Check if we already scraped this recently
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();

  try {
    // Basic implementation: we simulate finding products if not in DB
    // This populates the market for demonstration purposes
    const keywords = query.split(' ');

    const mockProducts = [
      {
        name: `${query.toUpperCase()} - Premium Choice`,
        current_price: 150000 + Math.floor(Math.random() * 50000),
        currency: 'XOF',
        image_url: 'https://placehold.co/400x400?text=Product',
        source_url: 'https://example.com',
        keywords: [query, ...keywords],
        last_scraped_at: now.toISOString()
      }
    ];

    for (const p of mockProducts) {
      await db.collection('market_products').add(p);
    }

    console.log(`[SCRAPER] Found and saved ${mockProducts.length} results for ${query}`);
  } catch (error) {
    console.error('[SCRAPER ERROR]', error.message);
  }
};

module.exports = { scrapeProductIfNeeded };
