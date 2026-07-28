const { db } = require('../config/firebase');
const axios = require('axios');
const cheerio = require('cheerio');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const jar = new CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true }));

/**
 * Parses Jumia price string (e.g. "150,000 FCFA") to Number.
 */
const parsePrice = (priceStr) => {
  if (!priceStr) return 0;
  const digits = priceStr.replace(/[^\d]/g, '');
  return parseInt(digits) || 0;
};

const COMMON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'no-cache'
};

/**
 * Fetches real results from Jumia CI with session support.
 */
const fetchJumiaPrices = async (query) => {
  try {
    // 1. Visit homepage first to establish session/cookies
    console.log('[JUMIA] Establishing session...');
    await client.get('https://www.jumia.ci/', {
      headers: COMMON_HEADERS,
      timeout: 8000
    }).catch(e => console.warn('[JUMIA] Session init warning:', e.message));

    // 2. Perform search with established session
    const searchUrl = `https://www.jumia.ci/catalog/?q=${encodeURIComponent(query)}`;
    const { data } = await client.get(searchUrl, {
      timeout: 12000,
      headers: {
        ...COMMON_HEADERS,
        'Referer': 'https://www.jumia.ci/',
        'Sec-Fetch-Site': 'same-origin'
      }
    });

    const $ = cheerio.load(data);
    const results = [];
    const now = new Date().toISOString();
    const keywords = query.split(/\s+/).filter(w => w.length > 2);

    const productsFound = $('article.prd');
    console.log(`[JUMIA] Results page fetched. Articles found: ${productsFound.length}`);

    productsFound.each((i, el) => {
      if (i >= 8) return;
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
          source_url: relativeLink.startsWith('http') ? relativeLink : `https://www.jumia.ci${relativeLink}`,
          keywords: [query, ...keywords],
          is_real: true,
          last_scraped_at: now
        });
      }
    });

    return results;
  } catch (error) {
    console.error(`[JUMIA SCRAPE ERROR] ${query}:`, error.response?.status === 403 ? 'BLOCKED' : error.message);
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
    // 1. Check existing results
    const existingSnap = await db.collection('market_products')
      .where('keywords', 'array-contains', query)
      .limit(10)
      .get();

    const existingResults = existingSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 2. Try Real Scrapping on Jumia
    let newResults = await fetchJumiaPrices(query);

    // 3. Fallback logic
    if (newResults.length === 0) {
      // IF we already have ANY results (even old estimates), return them without adding more junk
      if (existingResults.length > 0) {
        console.log(`[SCRAPER] Real scrape failed for ${query}, but we have existing data. Skipping estimate creation.`);
        return existingResults;
      }

      console.log(`[SCRAPER] Empty market for ${query}. Generating one-time smart estimate.`);
      const keywords = query.split(/\s+/).filter(w => w.length > 2);
      const brands = ['Samsung', 'Sony', 'LG', 'Hisense', 'TCL', 'Apple', 'Huawei'];
      const priceBase = query.includes('télé') || query.includes('tv') ? 150000 : 50000;
      const now = new Date().toISOString();

      newResults = [
        {
          name: `${brands[Math.floor(Math.random() * brands.length)]} ${query.toUpperCase()} - Crystal Edition`,
          current_price: priceBase + Math.floor(Math.random() * 80000),
          currency: 'XOF',
          image_url: 'https://placehold.co/400x400?text=Estimation+Galant',
          source_url: 'https://www.jumia.ci/catalog/?q=' + encodeURIComponent(query),
          keywords: [query, ...keywords],
          is_real: false,
          last_scraped_at: now
        }
      ];
    }

    const savedResults = [];
    for (const p of newResults) {
      // Add only if not already in existing by name (simple dedupe)
      if (!existingResults.some(er => er.name === p.name)) {
        const docRef = await db.collection('market_products').add(p);
        savedResults.push({ id: docRef.id, ...p });
      }
    }

    console.log(`[SCRAPER] Processed ${savedResults.length} new results for ${query}`);
    return [...existingResults, ...savedResults];
  } catch (error) {
    console.error('[SCRAPER GLOBAL ERROR]', error.message);
    return [];
  }
};

module.exports = { scrapeProductIfNeeded };
