const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const { db } = require('../config/firebase');

const TIKERAMA_SOURCE = 'TIKERAMA';
const TIKERAMA_BASE_URL = (process.env.TIKERAMA_BASE_URL || 'https://tikerama.com').replace(/\/+$/, '');
const TIKERAMA_IMPORT_LIMIT = Math.max(1, Math.min(50, Number(process.env.TIKERAMA_IMPORT_LIMIT || 24)));
const TIKERAMA_SYNC_INTERVAL_MS = Math.max(30 * 60 * 1000, Number(process.env.TIKERAMA_SYNC_INTERVAL_MS || 12 * 60 * 60 * 1000));
const TIKERAMA_SEARCH_BUDGET_MS = Math.max(10000, Math.min(55000, Number(process.env.TIKERAMA_SEARCH_BUDGET_MS || 45000)));
const TIKERAMA_SEARCH_TIMEOUT_MS = Math.max(3000, Math.min(10000, Number(process.env.TIKERAMA_SEARCH_TIMEOUT_MS || 5000)));
const TIKERAMA_SEARCH_DETAIL_LIMIT = Math.max(4, Math.min(30, Number(process.env.TIKERAMA_SEARCH_DETAIL_LIMIT || 18)));
const TIKERAMA_SEARCH_CONCURRENCY = Math.max(1, Math.min(6, Number(process.env.TIKERAMA_SEARCH_CONCURRENCY || 4)));
const TIKERAMA_META_DOC = 'tikerama_agenda_ci';
const COTE_D_IVOIRE = "Cote d'Ivoire";
const DEFAULT_CITY = 'Abidjan';
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200';

const LISTING_PATHS = [
  '/fr',
  '/fr/evenements',
  '/fr/evenements?search=concert',
  '/fr/evenements?q=concert',
];

const COMMON_HEADERS = {
  'User-Agent': 'GalantAgendaBot/1.0 (+https://galants.net; metadata-only)',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.7',
};

const IVORY_COAST_CITIES = [
  'abidjan',
  'yamoussoukro',
  'bouake',
  'bouake',
  'san-pedro',
  'san pedro',
  'daloa',
  'korhogo',
  'man',
  'gagnoa',
  'abengourou',
  'grand-bassam',
  'grand bassam',
];

const EVENT_KEYWORDS = [
  'concert',
  'festival',
  'live',
  'show',
  'spectacle',
  'soiree',
  'soiree',
  'event',
  'evenement',
  'humour',
  'comedie',
  'conference',
  'gala',
];

const TIKERAMA_AGENDA_CATEGORIES = {
  ALL: [],
  CONCERT: ['concert', 'live', 'show', 'spectacle', 'festival', 'gala'],
  FESTIVAL: ['festival'],
  NIGHTLIFE: ['soiree', 'night', 'club', 'dj', 'party'],
  CULTURE: ['culture', 'theatre', 'cinema', 'art', 'exposition', 'spectacle'],
  COMEDY: ['humour', 'comedie', 'stand up', 'stand-up'],
  BUSINESS: ['conference', 'business', 'networking', 'formation', 'atelier'],
  FOOD: ['brunch', 'diner', 'dejeuner', 'degustation', 'restaurant'],
};

const normalizeText = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const shortHash = (value) => crypto.createHash('sha1').update(String(value || '')).digest('hex').slice(0, 12);

const slugify = (value = '') => normalizeText(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 48) || 'event';

const normalizeCacheText = (value = '') => normalizeText(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '') || 'unknown';

const titleCaseCity = (value = '') => normalizeText(value)
  .toLowerCase()
  .split(' ')
  .filter(Boolean)
  .map(part => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const timeLeftMs = (deadlineAt) => deadlineAt ? Math.max(0, deadlineAt - Date.now()) : Number.POSITIVE_INFINITY;

const timeoutFor = (requestTimeoutMs, deadlineAt) => {
  const remaining = timeLeftMs(deadlineAt);
  if (remaining !== Number.POSITIVE_INFINITY && remaining <= 0) return 0;
  return Math.max(1000, Math.min(requestTimeoutMs, remaining));
};

const absoluteUrl = (url) => {
  if (!url) return null;
  try {
    return new URL(url, TIKERAMA_BASE_URL).toString();
  } catch {
    return null;
  }
};

const asArray = (value) => Array.isArray(value) ? value : value ? [value] : [];

const findJsonLdEvents = ($) => {
  const events = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const stack = asArray(parsed);
      while (stack.length) {
        const item = stack.shift();
        if (!item || typeof item !== 'object') continue;
        if (Array.isArray(item)) {
          stack.push(...item);
          continue;
        }
        if (item['@graph']) stack.push(...asArray(item['@graph']));
        const type = String(asArray(item['@type']).join(' ')).toLowerCase();
        if (type.includes('event')) events.push(item);
      }
    } catch {
      // Some pages embed invalid JSON-LD. Generic DOM extraction handles those.
    }
  });
  return events;
};

const firstImage = (value) => {
  const image = asArray(value)[0];
  if (!image) return null;
  if (typeof image === 'string') return absoluteUrl(image);
  return absoluteUrl(image.url || image.contentUrl);
};

const pickCity = (text = '') => {
  const normalized = normalizeText(text).toLowerCase();
  const found = IVORY_COAST_CITIES.find(city => normalized.includes(city));
  if (!found) return null;
  if (found.includes('yamoussoukro')) return 'Yamoussoukro';
  if (found.includes('bouake')) return 'Bouake';
  if (found.includes('san')) return 'San-Pedro';
  if (found.includes('daloa')) return 'Daloa';
  if (found.includes('korhogo')) return 'Korhogo';
  if (found.includes('man')) return 'Man';
  if (found.includes('gagnoa')) return 'Gagnoa';
  if (found.includes('abengourou')) return 'Abengourou';
  if (found.includes('grand')) return 'Grand-Bassam';
  return DEFAULT_CITY;
};

const hasIvoryCoastLocation = (text = '') => {
  const normalized = normalizeText(text).toLowerCase();
  return normalized.includes("cote d'ivoire") ||
    normalized.includes('ivory coast') ||
    IVORY_COAST_CITIES.some(city => normalized.includes(city));
};

const extractPriceLabel = (text = '', offers) => {
  const offer = asArray(offers)[0];
  if (offer && offer.price) {
    const currency = offer.priceCurrency || 'XOF';
    return `${offer.price} ${currency}`;
  }
  const match = normalizeText(text).match(/(\d[\d\s.]{2,})\s*(?:f|fcfa|xof)\b/i);
  return match ? `${match[1].replace(/\s+/g, ' ')} F` : null;
};

const eventTypeFor = (title = '', description = '') => {
  const text = normalizeText(`${title} ${description}`).toLowerCase();
  return /(concert|festival|live|show|spectacle|gala)/.test(text) ? 'LIVE_MUSIC' : 'EVENT';
};

const matchesCategory = (candidate = {}, category = 'ALL') => {
  const normalizedCategory = String(category || 'ALL').trim().toUpperCase();
  const keywords = TIKERAMA_AGENDA_CATEGORIES[normalizedCategory] || [];
  if (!keywords.length) return true;
  const text = normalizeText([
    candidate.title,
    candidate.description,
    candidate.venueName,
    candidate.address,
    candidate.url,
  ].filter(Boolean).join(' ')).toLowerCase();
  return keywords.some(keyword => text.includes(keyword));
};

const matchesCity = (candidate = {}, city = '') => {
  const normalizedCity = normalizeText(city).toLowerCase();
  if (!normalizedCity) return true;
  const text = normalizeText([
    candidate.city,
    candidate.address,
    candidate.venueName,
    candidate.locationText,
  ].filter(Boolean).join(' ')).toLowerCase();
  return text.includes(normalizedCity);
};

const isIvoryCoastEvent = (candidate = {}) => {
  const text = normalizeText([
    candidate.title,
    candidate.description,
    candidate.venueName,
    candidate.address,
    candidate.locationText,
    candidate.url,
  ].filter(Boolean).join(' ')).toLowerCase();

  return hasIvoryCoastLocation(text);
};

const looksLikeEvent = (candidate = {}) => {
  const text = normalizeText(`${candidate.title || ''} ${candidate.description || ''} ${candidate.url || ''}`).toLowerCase();
  return EVENT_KEYWORDS.some(keyword => text.includes(keyword));
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getListingLinks = async ({ maxListingPaths = LISTING_PATHS.length, requestTimeoutMs = 12000, deadlineAt = null } = {}) => {
  const links = new Set();

  for (const path of LISTING_PATHS.slice(0, maxListingPaths)) {
    const timeout = timeoutFor(requestTimeoutMs, deadlineAt);
    if (!timeout) break;
    try {
      const { data } = await axios.get(`${TIKERAMA_BASE_URL}${path}`, {
        headers: COMMON_HEADERS,
        timeout,
      });
      const $ = cheerio.load(data);
      $('a[href]').each((_, el) => {
        const href = String($(el).attr('href') || '');
        if (href.includes('/evenements/')) {
          const url = absoluteUrl(href);
          if (url) links.add(url.split('#')[0]);
        }
      });

      for (const event of findJsonLdEvents($)) {
        const url = absoluteUrl(event.url || event['@id']);
        if (url && url.includes('/evenements/')) links.add(url.split('#')[0]);
      }
    } catch (error) {
      console.warn('[tikerama] listing_fetch_failed', path, error.message);
    }
  }

  return [...links].slice(0, TIKERAMA_IMPORT_LIMIT * 2);
};

const parseEventDetail = async (url, { requestTimeoutMs = 12000, deadlineAt = null } = {}) => {
  const timeout = timeoutFor(requestTimeoutMs, deadlineAt);
  if (!timeout) return null;
  const { data } = await axios.get(url, {
    headers: COMMON_HEADERS,
    timeout,
  });
  const $ = cheerio.load(data);
  const pageText = normalizeText($('body').text());
  const jsonLd = findJsonLdEvents($)[0] || {};
  const location = typeof jsonLd.location === 'object' ? jsonLd.location : {};
  const addressValue = typeof location.address === 'object'
    ? Object.values(location.address).filter(Boolean).join(', ')
    : location.address;
  const offers = asArray(jsonLd.offers)[0] || {};

  const title = normalizeText(jsonLd.name || $('h1').first().text() || $('meta[property="og:title"]').attr('content'));
  const description = normalizeText(
    jsonLd.description ||
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    $('p').first().text()
  ).slice(0, 500);
  const image = firstImage(jsonLd.image) ||
    absoluteUrl($('meta[property="og:image"]').attr('content')) ||
    absoluteUrl($('img[src]').first().attr('src')) ||
    DEFAULT_IMAGE;
  const startDate = parseDate(jsonLd.startDate || $('time[datetime]').first().attr('datetime'));
  if (!startDate) return null;

  const endDate = parseDate(jsonLd.endDate) || new Date(startDate.getTime() + 12 * 60 * 60 * 1000);
  const venueName = normalizeText(location.name || $('[class*="location"], [class*="venue"], [class*="lieu"]').first().text()) || 'TIKERAMA';
  const address = normalizeText(addressValue || pageText.slice(0, 220));
  const locationText = `${address} ${pageText}`;
  const city = pickCity(locationText);
  const priceLabel = extractPriceLabel(pageText, offers);
  const ticketUrl = absoluteUrl(offers.url || url) || url;

  const candidate = {
    url,
    title,
    description,
    image,
    startDate,
    endDate,
    venueName,
    address,
    city,
    locationText,
    priceLabel,
    ticketUrl,
    eventType: eventTypeFor(title, description),
  };

  if (!title || !isIvoryCoastEvent(candidate) || !looksLikeEvent(candidate)) return null;
  if (endDate.getTime() < Date.now() - 12 * 60 * 60 * 1000) return null;

  return { ...candidate, city };
};

const toAdminCandidate = (event) => ({
  external_id: `external_tikerama_${shortHash(event.url)}`,
  source: TIKERAMA_SOURCE,
  title: event.title,
  description: event.description || 'Evenement reference depuis TIKERAMA.',
  image: event.image || DEFAULT_IMAGE,
  photo_url: event.image || DEFAULT_IMAGE,
  start_date: event.startDate.toISOString(),
  end_date: event.endDate.toISOString(),
  starts_at: event.startDate.toISOString(),
  expires_at: event.endDate.toISOString(),
  venue_name: event.venueName || 'TIKERAMA',
  address: event.address || event.city || DEFAULT_CITY,
  city: event.city || DEFAULT_CITY,
  country: COTE_D_IVOIRE,
  price_label: event.priceLabel || null,
  source_url: event.url,
  external_ticket_url: event.ticketUrl || event.url,
  event_type: event.eventType || eventTypeFor(event.title, event.description),
});

const fromAdminCandidate = (candidate = {}) => {
  const url = absoluteUrl(candidate.source_url || candidate.url || candidate.external_ticket_url);
  const startDate = parseDate(candidate.start_date || candidate.starts_at);
  const endDate = parseDate(candidate.end_date || candidate.expires_at) ||
    (startDate ? new Date(startDate.getTime() + 12 * 60 * 60 * 1000) : null);
  const title = normalizeText(candidate.title);
  const description = normalizeText(candidate.description || '').slice(0, 500);
  const venueName = normalizeText(candidate.venue_name || candidate.venueName || 'TIKERAMA');
  const address = normalizeText(candidate.address || candidate.city || DEFAULT_CITY);
  const city = pickCity(`${candidate.city || ''} ${address}`) || normalizeText(candidate.city || DEFAULT_CITY);

  if (!url || !startDate || !endDate || !title) return null;
  if (!url.startsWith(`${TIKERAMA_BASE_URL}/`)) return null;

  const event = {
    url,
    title,
    description,
    image: absoluteUrl(candidate.image || candidate.photo_url) || DEFAULT_IMAGE,
    startDate,
    endDate,
    venueName,
    address,
    city: city || DEFAULT_CITY,
    locationText: `${candidate.city || ''} ${address} ${candidate.country || ''}`,
    priceLabel: candidate.price_label || null,
    ticketUrl: absoluteUrl(candidate.external_ticket_url || candidate.source_url || url) || url,
    eventType: ['EVENT', 'PARTY', 'FLASH_OFFER', 'NETWORKING', 'LIVE_MUSIC'].includes(candidate.event_type)
      ? candidate.event_type
      : eventTypeFor(title, description),
  };

  if (!isIvoryCoastEvent(event)) return null;
  if (event.endDate.getTime() < Date.now() - 12 * 60 * 60 * 1000) return null;
  return event;
};

const searchTikeramaAgendaCandidates = async ({
  city = DEFAULT_CITY,
  category = 'ALL',
  maxEvents = TIKERAMA_IMPORT_LIMIT,
  maxListingPaths = LISTING_PATHS.length,
  requestTimeoutMs = 12000,
  searchBudgetMs = TIKERAMA_SEARCH_BUDGET_MS,
  detailConcurrency = TIKERAMA_SEARCH_CONCURRENCY,
  maxDetailLinks = TIKERAMA_SEARCH_DETAIL_LIMIT,
} = {}) => {
  if (process.env.TIKERAMA_AGENDA_ENABLED === 'false') {
    return { skipped: true, reason: 'disabled', candidates: [] };
  }

  const limit = Math.max(1, Math.min(TIKERAMA_IMPORT_LIMIT, Number(maxEvents || TIKERAMA_IMPORT_LIMIT)));
  const cleanCity = titleCaseCity(city) || DEFAULT_CITY;
  const deadlineAt = Date.now() + Math.max(10000, Math.min(55000, Number(searchBudgetMs || TIKERAMA_SEARCH_BUDGET_MS)));
  const boundedTimeoutMs = Math.max(1000, Math.min(TIKERAMA_SEARCH_TIMEOUT_MS, Number(requestTimeoutMs || TIKERAMA_SEARCH_TIMEOUT_MS)));
  const links = await getListingLinks({ maxListingPaths, requestTimeoutMs: boundedTimeoutMs, deadlineAt });
  const detailLinks = links.slice(0, Math.max(limit, Math.min(Number(maxDetailLinks || TIKERAMA_SEARCH_DETAIL_LIMIT), TIKERAMA_SEARCH_DETAIL_LIMIT)));
  const workerCount = Math.max(1, Math.min(Number(detailConcurrency || TIKERAMA_SEARCH_CONCURRENCY), TIKERAMA_SEARCH_CONCURRENCY, detailLinks.length || 1));
  const candidates = [];
  const errors = [];
  let cursor = 0;

  const scanNext = async () => {
    while (candidates.length < limit && timeLeftMs(deadlineAt) > 1000) {
      const link = detailLinks[cursor++];
      if (!link) return;

      try {
        const event = await parseEventDetail(link, { requestTimeoutMs: boundedTimeoutMs, deadlineAt });
        if (!event) continue;
        if (!matchesCity(event, cleanCity)) continue;
        if (!matchesCategory(event, category)) continue;
        const resolvedCity = event.city || cleanCity;
        candidates.push(toAdminCandidate({ ...event, city: resolvedCity }));
      } catch (error) {
        errors.push({ url: link, message: error.message });
        console.warn('[tikerama] candidate_fetch_failed', link, error.message);
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => scanNext()));

  return {
    candidates: candidates.slice(0, limit),
    candidate_count: Math.min(candidates.length, limit),
    scanned_count: detailLinks.length,
    error_count: errors.length,
    sample_errors: errors.slice(0, 3),
  };
};

const upsertEvent = async (event) => {
  const now = new Date().toISOString();
  const venueId = `external_tikerama_${slugify(event.city)}_${shortHash(event.venueName)}`;
  const eventId = `external_tikerama_${shortHash(event.url)}`;

  await db.collection('venues').doc(venueId).set({
    name: event.venueName || 'TIKERAMA',
    description: 'Lieu reference depuis TIKERAMA. Reservation officielle via TIKERAMA.',
    city: event.city || DEFAULT_CITY,
    country: COTE_D_IVOIRE,
    address: event.address || event.city || DEFAULT_CITY,
    city_normalized: normalizeCacheText(event.city || DEFAULT_CITY),
    venue_type: event.eventType === 'LIVE_MUSIC' ? 'OTHER' : 'OTHER',
    benefit_description: event.priceLabel ? `Billetterie TIKERAMA - ${event.priceLabel}` : 'Billetterie officielle via TIKERAMA',
    photo_url: event.image,
    photo_variants: {},
    source: TIKERAMA_SOURCE,
    source_url: event.url,
    status: 'APPROVED',
    is_editorial: true,
    updated_at: now,
  }, { merge: true });

  await db.collection('venue_events').doc(eventId).set({
    venue_id: venueId,
    title: event.title,
    description: event.description || 'Evenement reference depuis TIKERAMA.',
    photo_url: event.image,
    photo_variants: {},
    event_type: event.eventType,
    starts_at: event.startDate.toISOString(),
    expires_at: event.endDate.toISOString(),
    source: TIKERAMA_SOURCE,
    source_label: 'Billetterie via TIKERAMA',
    source_url: event.url,
    external_ticket_url: event.ticketUrl || event.url,
    city: event.city || DEFAULT_CITY,
    city_normalized: normalizeCacheText(event.city || DEFAULT_CITY),
    country: COTE_D_IVOIRE,
    price_label: event.priceLabel,
    is_external: true,
    status: 'APPROVED',
    attendees_count: 0,
    updated_at: now,
    imported_at: now,
  }, { merge: true });

  return eventId;
};

const importSelectedTikeramaAgendaEvents = async ({ candidates = [] } = {}) => {
  const rows = Array.isArray(candidates) ? candidates.slice(0, TIKERAMA_IMPORT_LIMIT) : [];
  const imported = [];
  const skipped = [];

  for (const row of rows) {
    const event = fromAdminCandidate(row);
    if (!event) {
      skipped.push({ external_id: row?.external_id || null, reason: 'invalid_candidate' });
      continue;
    }
    try {
      imported.push(await upsertEvent(event));
    } catch (error) {
      skipped.push({ external_id: row?.external_id || null, reason: error.message });
      console.warn('[tikerama] selected_import_failed', row?.external_id || row?.source_url, error.message);
    }
  }

  return {
    imported_count: imported.length,
    skipped_count: skipped.length,
    imported,
    skipped,
  };
};

const shouldSync = async (force) => {
  if (force) return true;
  const doc = await db.collection('integrations').doc(TIKERAMA_META_DOC).get();
  if (!doc.exists) return true;
  const meta = doc.data();
  const startedAt = parseDate(meta.started_at);
  if (meta.status === 'running' && startedAt && Date.now() - startedAt.getTime() < 15 * 60 * 1000) return false;
  const lastSyncedAt = meta.last_synced_at;
  const lastSyncDate = parseDate(lastSyncedAt);
  return !lastSyncDate || Date.now() - lastSyncDate.getTime() > TIKERAMA_SYNC_INTERVAL_MS;
};

const syncTikeramaAgendaIfNeeded = async ({
  force = false,
  maxEvents = TIKERAMA_IMPORT_LIMIT,
  maxListingPaths = LISTING_PATHS.length,
  requestTimeoutMs = 12000,
} = {}) => {
  if (process.env.TIKERAMA_AGENDA_ENABLED === 'false') {
    return { skipped: true, reason: 'disabled' };
  }
  if (!(await shouldSync(force))) {
    return { skipped: true, reason: 'fresh' };
  }

  const metaRef = db.collection('integrations').doc(TIKERAMA_META_DOC);
  await metaRef.set({ status: 'running', started_at: new Date().toISOString() }, { merge: true });

  const importLimit = Math.max(1, Math.min(TIKERAMA_IMPORT_LIMIT, Number(maxEvents || TIKERAMA_IMPORT_LIMIT)));
  const links = await getListingLinks({ maxListingPaths, requestTimeoutMs });
  const imported = [];
  const errors = [];

  for (const link of links.slice(0, importLimit)) {
    try {
      const event = await parseEventDetail(link, { requestTimeoutMs });
      if (!event) continue;
      imported.push(await upsertEvent(event));
    } catch (error) {
      errors.push({ url: link, message: error.message });
      console.warn('[tikerama] event_import_failed', link, error.message);
    }
  }

  const payload = {
    status: 'idle',
    last_synced_at: new Date().toISOString(),
    imported_count: imported.length,
    candidate_count: links.length,
    error_count: errors.length,
    sample_errors: errors.slice(0, 3),
  };
  await metaRef.set(payload, { merge: true });

  return payload;
};

module.exports = {
  syncTikeramaAgendaIfNeeded,
  searchTikeramaAgendaCandidates,
  importSelectedTikeramaAgendaEvents,
  TIKERAMA_AGENDA_CATEGORIES,
  TIKERAMA_SOURCE,
};
