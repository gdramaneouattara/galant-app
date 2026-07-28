const { db } = require('../config/firebase');
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Parses Jumia price string (e.g. "150,000 FCFA") to Number.
 */
const parsePrice = (priceStr) => {
  if (!priceStr) return 0;
  const digits = priceStr.replace(/[^\d]/g, '');
  return parseInt(digits) || 0;
};

/**
 * Fetches real results from Jumia CI.
 */
const fetchJumiaPrices = async (query) => {
  const url = `https://www.jumia.ci/catalog/?q=${encodeURIComponent(query)}`;
  try {
    const { data } = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    const $ = cheerio.load(data);
    const results = [];
    const now = new Date().toISOString();
    const keywords = query.split(/\s+/).filter(w => w.length > 2);

    $('article.prd').each((i, el) => {
      if (i >= 5) return; // Limit to 5 first results for speed
      const name = $(el).find('h3.name').text().trim();
      const priceRaw = $(el).find('div.prc').first().text().trim();
      const relativeLink = $(el).find('a.core').attr('href');
      const img = $(el).find('img.img').attr('data-src') || $(el).find('img.img').attr('src');

      if (name && priceRaw && relativeLink) {
        results.push({
          name,
          current_price: parsePrice(priceRaw),
          currency: 'XOF',
          image_url: img || 'https://placehold.co/400x400?text=Product',
          source_url: `https://www.jumia.ci${relativeLink}`,
          keywords: [query, ...keywords],
          is_real: true,
          last_scraped_at: now
        });
      }
    });

    return results;
  } catch (error) {
    console.error(`[JUMIA SCRAPE ERROR] ${query}:`, error.message);
    return [];
  }
};

/**
 * Main scraper entry point.
 * Tries Jumia CI first, falls back to simulated data on block/error.
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

    // 2. Try Real Scrapping on Jumia
    let newResults = await fetchJumiaPrices(query);

    // 3. Fallback to simulation if real scrapping failed or was empty
    if (newResults.length === 0) {
      console.log(`[SCRAPER] Real scrape failed or empty for ${query}. Using intelligent fallback simulation.`);
      const keywords = query.split(/\s+/).filter(w => w.length > 2);
      const brands = ['Samsung', 'Sony', 'LG', 'Hisense', 'TCL', 'Apple', 'Huawei'];
      const priceBase = query.includes('télé') || query.includes('tv') ? 150000 : 50000;
      const now = new Date().toISOString();

      newResults = [
        {
          name: `${brands[Math.floor(Math.random() * brands.length)]} ${query.toUpperCase()} - Crystal Edition`,
          current_price: priceBase + Math.floor(Math.random() * 80000),
          currency: 'XOF',
          image_url: 'https://placehold.co/400x400?text=Premium+Choice',
          source_url: 'https://jumia.ci/search?q=' + encodeURIComponent(query),
          keywords: [query, ...keywords],
          is_real: false,
          last_scraped_at: now
        }
      ];
    }

    const savedResults = [];
    for (const p of newResults) {
      const docRef = await db.collection('market_products').add(p);
      savedResults.push({ id: docRef.id, ...p });
    }

    console.log(`[SCRAPER] Processed ${savedResults.length} results for ${query}`);
    return savedResults;
  } catch (error) {
    console.error('[SCRAPER GLOBAL ERROR]', error.message);
    return [];
  }
};

module.exports = { scrapeProductIfNeeded };
