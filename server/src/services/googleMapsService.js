const axios = require('axios');
const crypto = require('crypto');
const { db } = require('../config/firebase');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const MIN_PRESTIGE_RATING = 4.0;
const MIN_USER_DISCOVERY_RATING = 3.0;
const DEFAULT_LIMIT = 20;
const GOOGLE_SEARCH_PAGE_SIZE = 10;
const GOOGLE_SEARCH_EXPANDED_PAGE_SIZE = 20;
const GOOGLE_SEARCH_MAX_PAGES = 3;
const USER_DISCOVERY_CACHE_DAYS = Math.max(1, Math.min(30, Number(process.env.PARTNER_DISCOVERY_CACHE_DAYS || 14)));
const GOOGLE_PHOTO_WIDTHS = {
  thumb: 320,
  medium: 800,
  full: 1200
};
const GOOGLE_VENUE_PLACEHOLDER = 'https://placehold.co/800x600?text=Galant';

const CATEGORY_QUERIES = [
  { googleType: 'restaurant', venueType: 'RESTAURANT', label: 'restaurants gastronomiques' },
  { googleType: 'night_club', venueType: 'LOUNGE', label: 'lounges premium' },
  { googleType: 'bar', venueType: 'LOUNGE', label: 'bars lounge premium' },
  { googleType: 'hotel', venueType: 'HOTEL', label: 'hotels de luxe' },
  { googleType: 'cafe', venueType: 'CAFE', label: 'cafes elegants' },
  { googleType: 'spa', venueType: 'BEAUTY', label: 'spas premium' },
  { googleType: 'beauty_salon', venueType: 'BEAUTY', label: 'instituts de beaute haut standing' },
  { googleType: 'florist', venueType: 'GIFTS', label: 'fleuristes elegants' },
  { googleType: 'gift_shop', venueType: 'GIFTS', label: 'boutiques cadeaux romantiques' },
  { googleType: 'museum', venueType: 'CULTURE', label: 'musees et lieux culturels' },
  { googleType: 'art_gallery', venueType: 'CULTURE', label: 'galeries d art' },
  { googleType: 'movie_theater', venueType: 'CULTURE', label: 'cinemas premium' },
  { googleType: 'park', venueType: 'CULTURE', label: 'parcs et promenades' }
];

const USER_DISCOVERY_CATEGORY_TYPES = {
  ALL: CATEGORY_QUERIES.map((category) => category.googleType),
  RESTAURANT: ['restaurant'],
  LOUNGE: ['night_club', 'bar'],
  HOTEL: ['hotel'],
  CAFE: ['cafe'],
  BEAUTY: ['spa', 'beauty_salon'],
  GIFTS: ['florist', 'gift_shop'],
  CULTURE: ['museum', 'art_gallery', 'movie_theater', 'park']
};

const ADMIN_SEEDER_CATEGORY_TYPES = { ...USER_DISCOVERY_CATEGORY_TYPES };

const USER_DISCOVERY_RATING_LEVELS = {
  ALL: { min: MIN_USER_DISCOVERY_RATING, max: null, label: 'tous les niveaux' },
  PRESTIGE: { min: 4.5, max: 5, label: 'prestige' },
  HIGH: { min: 4.0, max: 4.49, label: 'tres bien notes' },
  GOOD: { min: 3.0, max: 3.99, label: 'corrects' }
};

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.types',
  'places.photos',
  'places.googleMapsUri',
  'places.websiteUri',
  'places.internationalPhoneNumber',
  'nextPageToken'
].join(',');

const normalizePlaceName = (place) => String(place?.displayName?.text || '').trim();

const normalizeCacheText = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '') || 'unknown';

const normalizeRequestedType = (type) => {
  const cleanType = String(type || '').trim();
  if (cleanType === 'lodging') return 'hotel';
  return cleanType;
};

const normalizeUserRatingLevel = (ratingLevel = 'PRESTIGE') => {
  const cleanLevel = String(ratingLevel || 'PRESTIGE').trim().toUpperCase();
  return USER_DISCOVERY_RATING_LEVELS[cleanLevel] ? cleanLevel : 'PRESTIGE';
};

const hasAdminPrestigeRating = (place) => Number(place.rating || 0) > MIN_PRESTIGE_RATING;

const matchesRatingFilter = (place, ratingFilter) => {
  const rating = Number(place.rating || 0);
  if (!Number.isFinite(rating)) return false;
  if (!ratingFilter) return hasAdminPrestigeRating(place);
  if (rating < Number(ratingFilter.min || 0)) return false;
  if (ratingFilter.max !== null && ratingFilter.max !== undefined && rating > Number(ratingFilter.max)) return false;
  return true;
};

const shouldExpandForRatingFilter = (ratingFilter) => (
  ratingFilter &&
  ratingFilter.max !== null &&
  ratingFilter.max !== undefined
);

const waitForNextPlacesPage = () => new Promise((resolve) => setTimeout(resolve, 250));

const getGoogleErrorInfo = (error) => {
  const data = error?.response?.data;
  const apiError = data?.error || {};
  return {
    status: error?.response?.status || null,
    code: apiError.status || apiError.code || null,
    message: apiError.message || error?.message || 'google_places_failed'
  };
};

const normalizePhotoSize = (size = 'medium') => (
  GOOGLE_PHOTO_WIDTHS[size] ? size : 'medium'
);

const buildGooglePhotoMediaUrl = (photoName, size = 'medium') => {
  if (!photoName || !GOOGLE_MAPS_API_KEY) return GOOGLE_VENUE_PLACEHOLDER;
  const normalizedSize = normalizePhotoSize(size);
  return `https://places.googleapis.com/v1/${photoName}/media?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&maxWidthPx=${GOOGLE_PHOTO_WIDTHS[normalizedSize]}`;
};

const extractGooglePhotoNameFromUrl = (value) => {
  if (typeof value !== 'string' || !value.includes('places.googleapis.com/v1/')) return null;
  const match = value.match(/places\.googleapis\.com\/v1\/(.+?)\/media(?:\?|$)/);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

const normalizePhotoMetadata = (place) => {
  const photo = place?.photos?.[0];
  if (!photo?.name) return null;
  return {
    name: photo.name,
    width_px: photo.widthPx || null,
    height_px: photo.heightPx || null,
    author_attributions: Array.isArray(photo.authorAttributions)
      ? photo.authorAttributions.map((attribution) => ({
        display_name: attribution.displayName || null,
        uri: attribution.uri || null,
        photo_uri: attribution.photoUri || null,
      }))
      : [],
  };
};

const buildDirectPhotoUrl = (venue, size = 'medium') => (
  buildGooglePhotoMediaUrl(venue?.google_photo_name, size)
);

const toVenue = (place, city, category) => {
  const now = new Date().toISOString();
  const photo = normalizePhotoMetadata(place);
  const normalizedCity = String(city || 'Autour de vous').trim();
  return {
    google_place_id: place.id,
    name: normalizePlaceName(place),
    address: place.formattedAddress || normalizedCity,
    city: normalizedCity,
    city_normalized: normalizeCacheText(normalizedCity),
    latitude: place.location?.latitude || null,
    longitude: place.location?.longitude || null,
    rating: Number(place.rating),
    user_ratings_total: Number(place.userRatingCount || 0),
    google_types: place.types || [],
    google_maps_uri: place.googleMapsUri || null,
    website_url: place.websiteUri || null,
    phone_number: place.internationalPhoneNumber || null,
    venue_type: category.venueType,
    photo_url: photo ? null : GOOGLE_VENUE_PLACEHOLDER,
    google_photo_name: photo?.name || null,
    google_photo_width_px: photo?.width_px || null,
    google_photo_height_px: photo?.height_px || null,
    google_photo_attributions: photo?.author_attributions || [],
    image_source: photo ? 'google_places' : 'galant_placeholder',
    description: `Une adresse d'exception selectionnee par la Conciergerie Galant a ${city}.`,
    status: 'APPROVED',
    is_editorial: true,
    source: 'GOOGLE_PLACES',
    created_at: now,
    updated_at: now
  };
};

const hasCoordinates = (latitude, longitude) => (
  Number.isFinite(Number(latitude)) &&
  Number.isFinite(Number(longitude)) &&
  Math.abs(Number(latitude)) <= 90 &&
  Math.abs(Number(longitude)) <= 180
);

const buildSearchBody = (city, category, options = {}) => {
  const useLocationBias = hasCoordinates(options.latitude, options.longitude);
  const shouldExpand = shouldExpandForRatingFilter(options.ratingFilter);
  const body = {
    textQuery: useLocationBias
      ? `best ${category.label} nearby`
      : `best ${category.label} in ${city}`,
    languageCode: 'fr',
    includedType: category.googleType,
    strictTypeFiltering: true,
    minRating: MIN_PRESTIGE_RATING,
    pageSize: shouldExpand ? GOOGLE_SEARCH_EXPANDED_PAGE_SIZE : GOOGLE_SEARCH_PAGE_SIZE
  };

  if (Number.isFinite(Number(options.minRating))) {
    body.minRating = Number(options.minRating);
  }

  if (useLocationBias) {
    const radiusMeters = Math.max(1000, Math.min(50000, Number(options.radiusKm || 15) * 1000));
    body.locationBias = {
      circle: {
        center: {
          latitude: Number(options.latitude),
          longitude: Number(options.longitude)
        },
        radius: radiusMeters
      }
    };
    body.rankPreference = 'DISTANCE';
  }

  if (options.pageToken) {
    body.pageToken = String(options.pageToken);
  }

  return body;
};

const searchCategory = async (city, category, options = {}) => {
  const shouldExpand = shouldExpandForRatingFilter(options.ratingFilter);
  const maxPages = shouldExpand ? GOOGLE_SEARCH_MAX_PAGES : 1;
  const targetMatches = Math.max(1, Math.min(DEFAULT_LIMIT, Number(options.limit || DEFAULT_LIMIT)));
  let pageToken = null;
  const matchedPlaces = [];

  for (let page = 0; page < maxPages; page += 1) {
    if (page > 0) await waitForNextPlacesPage();

    const response = await axios.post(GOOGLE_TEXT_SEARCH_URL, buildSearchBody(city, category, { ...options, pageToken }), {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': FIELD_MASK
      }
    });

    const pageMatches = (response.data.places || [])
      .filter((place) => place?.id && normalizePlaceName(place))
      .filter((place) => matchesRatingFilter(place, options.ratingFilter));

    matchedPlaces.push(...pageMatches);
    if (matchedPlaces.length >= targetMatches) break;

    pageToken = response.data.nextPageToken || null;
    if (!pageToken) break;
  }

  return matchedPlaces.map((place) => toVenue(place, city, category));
};

const searchGoogleVenueCandidates = async (
  city,
  types = CATEGORY_QUERIES.map((category) => category.googleType),
  limit = DEFAULT_LIMIT,
  options = {}
) => {
  if (!GOOGLE_MAPS_API_KEY) throw new Error('missing_google_maps_api_key');

  const cleanCity = String(city || options.city || '').trim();
  if (!cleanCity && !hasCoordinates(options.latitude, options.longitude)) throw new Error('missing_city_or_location');

  try {
    const requestedTypes = new Set((types || []).map(normalizeRequestedType).filter(Boolean));
    const categories = CATEGORY_QUERIES.filter((category) => requestedTypes.has(category.googleType));
    const settled = await Promise.allSettled(
      categories.map((category) => searchCategory(cleanCity || 'Autour de vous', category, { ...options, limit }))
    );
    const batches = settled
      .filter((entry) => entry.status === 'fulfilled')
      .map((entry) => entry.value);
    const categoryErrors = settled
      .map((entry, index) => ({ entry, category: categories[index] }))
      .filter(({ entry }) => entry.status === 'rejected')
      .map(({ entry, category }) => ({
        type: category.googleType,
        ...getGoogleErrorInfo(entry.reason)
      }));

    if (!batches.length && categoryErrors.length) {
      const first = categoryErrors[0];
      const error = new Error('google_places_failed');
      error.details = first.message;
      error.googleStatus = first.status;
      error.googleCode = first.code;
      error.categoryErrors = categoryErrors;
      throw error;
    }

    if (categoryErrors.length) {
      console.warn('Google Places partial errors:', categoryErrors);
    }

    const seen = new Set();

    return batches.flat()
      .filter((venue) => {
        if (seen.has(venue.google_place_id)) return false;
        seen.add(venue.google_place_id);
        return true;
      })
      .sort((left, right) => {
        const ratingDelta = Number(right.rating || 0) - Number(left.rating || 0);
        if (ratingDelta !== 0) return ratingDelta;
        return Number(right.user_ratings_total || 0) - Number(left.user_ratings_total || 0);
      })
      .slice(0, Math.max(1, Math.min(DEFAULT_LIMIT, Number(limit) || DEFAULT_LIMIT)));
  } catch (error) {
    if (error.message === 'google_places_failed') {
      console.error('Google Places API Error:', {
        details: error.details,
        googleStatus: error.googleStatus,
        googleCode: error.googleCode,
        categoryErrors: error.categoryErrors
      });
      throw error;
    }

    const info = getGoogleErrorInfo(error);
    console.error('Google Places API Error:', error.response?.data || error.message);
    const wrapped = new Error('google_places_failed');
    wrapped.details = info.message;
    wrapped.googleStatus = info.status;
    wrapped.googleCode = info.code;
    throw wrapped;
  }
};

const searchVenuesInCity = async (
  city,
  types = CATEGORY_QUERIES.map((category) => category.googleType),
  limit = DEFAULT_LIMIT
) => searchGoogleVenueCandidates(city, types, limit);

const discoveryCacheKey = ({ city, latitude, longitude, radiusKm, category, ratingLevel, limit }) => {
  const hasLocation = hasCoordinates(latitude, longitude);
  const locationBucket = hasLocation
    ? `${Number(latitude).toFixed(2)}_${Number(longitude).toFixed(2)}`
    : normalizeCacheText(city);
  const rawKey = [
    'partner_discovery_v1',
    normalizeCacheText(category || 'ALL'),
    normalizeCacheText(ratingLevel || 'ALL'),
    Math.max(1, Math.min(50, Number(radiusKm || 15))),
    Math.max(1, Math.min(DEFAULT_LIMIT, Number(limit) || DEFAULT_LIMIT)),
    locationBucket,
  ].join(':');
  return crypto.createHash('sha1').update(rawKey).digest('hex');
};

const getCachedUserPartnerDiscovery = async (params) => {
  const key = discoveryCacheKey(params);
  const ref = db.collection('partner_discovery_cache').doc(key);
  const snap = await ref.get();
  if (!snap.exists) return { key, venues: null };

  const data = snap.data();
  if (!data?.expires_at || String(data.expires_at) <= new Date().toISOString()) {
    return { key, venues: null };
  }

  return { key, venues: Array.isArray(data.venues) ? data.venues : null };
};

const setCachedUserPartnerDiscovery = async (key, params, venues) => {
  const now = Date.now();
  await db.collection('partner_discovery_cache').doc(key).set({
    city: String(params.city || '').trim() || null,
    latitude: hasCoordinates(params.latitude, params.longitude) ? Number(params.latitude) : null,
    longitude: hasCoordinates(params.latitude, params.longitude) ? Number(params.longitude) : null,
    radius_km: Math.max(1, Math.min(50, Number(params.radiusKm || 15))),
    category: String(params.category || 'ALL').trim().toUpperCase(),
    rating_level: String(params.ratingLevel || 'ALL').trim().toUpperCase(),
    venues,
    created_at: new Date(now).toISOString(),
    expires_at: new Date(now + USER_DISCOVERY_CACHE_DAYS * 24 * 60 * 60 * 1000).toISOString()
  });
};

const searchUserPartnerDiscovery = async ({
  city,
  latitude,
  longitude,
  radiusKm = 15,
  limit = DEFAULT_LIMIT,
  category = 'ALL',
  ratingLevel = 'PRESTIGE'
}) => {
  const normalizedCategory = String(category || 'ALL').trim().toUpperCase();
  const normalizedRatingLevel = normalizeUserRatingLevel(ratingLevel);
  const ratingFilter = USER_DISCOVERY_RATING_LEVELS[normalizedRatingLevel];
  const requestedTypes = USER_DISCOVERY_CATEGORY_TYPES[normalizedCategory] || USER_DISCOVERY_CATEGORY_TYPES.ALL;
  const params = { city, latitude, longitude, radiusKm, limit, category: normalizedCategory, ratingLevel: normalizedRatingLevel };
  const cached = await getCachedUserPartnerDiscovery(params);
  if (cached.venues) {
    return cached.venues.map((venue) => ({ ...venue, cache_hit: true }));
  }

  const venues = await searchGoogleVenueCandidates(city, requestedTypes, limit, {
    city,
    latitude,
    longitude,
    radiusKm,
    minRating: ratingFilter.min,
    ratingFilter
  });

  const mapped = venues.map((venue) => {
    const thumb = buildDirectPhotoUrl(venue, 'thumb');
    return {
      ...venue,
      id: `google_${venue.google_place_id}`,
      photo_url: thumb,
      photo_variants: {
        [thumb]: {
          thumb,
          medium: buildDirectPhotoUrl(venue, 'medium'),
          full: buildDirectPhotoUrl(venue, 'full'),
        }
      },
      source: 'GOOGLE_PLACES_DIRECT',
      rating_level: normalizedRatingLevel,
      is_user_discovery: true
    };
  });

  await setCachedUserPartnerDiscovery(cached.key, params, mapped);
  return mapped;
};

module.exports = {
  searchVenuesInCity,
  searchUserPartnerDiscovery,
  buildGooglePhotoMediaUrl,
  extractGooglePhotoNameFromUrl,
  GOOGLE_PHOTO_WIDTHS,
  GOOGLE_VENUE_PLACEHOLDER,
  CATEGORY_QUERIES,
  USER_DISCOVERY_CATEGORY_TYPES,
  ADMIN_SEEDER_CATEGORY_TYPES,
  USER_DISCOVERY_RATING_LEVELS,
  MIN_PRESTIGE_RATING,
  USER_DISCOVERY_CACHE_DAYS,
  normalizeCacheText
};
