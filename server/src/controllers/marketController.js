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

    // 2. If no results, WAIT for a quick scrape
    if (products.length === 0) {
      console.log(`[MARKET] No results for "${query}". Triggering direct scrape...`);
      products = await scrapeProductIfNeeded(query);
    } else if (products.length < 3) {
      // If only a few results, scrape more in background
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

/**
 * Clears market products for a specific keyword.
 */
const clearMarketCache = async (req, res) => {
  const { q } = req.body;
  if (!q) return res.status(400).json({ error: 'missing_query' });

  try {
    const query = q.toLowerCase().trim();
    const snapshot = await db.collection('market_products')
      .where('keywords', 'array-contains', query)
      .get();

    if (snapshot.empty) {
      return res.json({ success: true, deleted: 0 });
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    res.json({ success: true, deleted: snapshot.size });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { searchProducts, getTrends, clearMarketCache };
