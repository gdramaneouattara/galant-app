const { db } = require('../config/firebase');
const { scrapeProductIfNeeded } = require('../services/scrapperService');

/**
 * Searches for products in Firestore or triggers a scrape.
 */
const searchProducts = async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'missing_query' });

  try {
    const query = q.toLowerCase().trim();

    // 1. Search in existing products
    const snapshot = await db.collection('market_products')
      .where('keywords', 'array-contains', query)
      .limit(20)
      .get();

    let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. If no results or very few, trigger an async scrape for future users
    // In a real production app, we would wait for the scrape or use a specialized search engine
    if (products.length < 5) {
      void scrapeProductIfNeeded(query);
    }

    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Gets trending products on the market.
 */
const getTrends = async (req, res) => {
  try {
    const snapshot = await db.collection('market_products')
      .orderBy('last_scraped_at', 'desc')
      .limit(10)
      .get();

    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { searchProducts, getTrends };
