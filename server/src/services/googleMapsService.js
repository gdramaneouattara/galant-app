const axios = require('axios');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const MIN_PRESTIGE_RATING = 4.0;
const DEFAULT_LIMIT = 20;

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
  'places.internationalPhoneNumber'
].join(',');

const normalizePlaceName = (place) => String(place?.displayName?.text || '').trim();

const normalizeRequestedType = (type) => {
  const cleanType = String(type || '').trim();
  if (cleanType === 'lodging') return 'hotel';
  return cleanType;
};

const getGoogleErrorInfo = (error) => {
  const data = error?.response?.data;
  const apiError = data?.error || {};
  return {
    status: error?.response?.status || null,
    code: apiError.status || apiError.code || null,
    message: apiError.message || error?.message || 'google_places_failed'
  };
};

const buildPhotoUrl = (place) => {
  const photoName = place?.photos?.[0]?.name;
  if (!photoName) return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800';
  return `https://places.googleapis.com/v1/${photoName}/media?key=${GOOGLE_MAPS_API_KEY}&maxWidthPx=1200`;
};

const toVenue = (place, city, category) => {
  const now = new Date().toISOString();
  return {
    google_place_id: place.id,
    name: normalizePlaceName(place),
    address: place.formattedAddress || city,
    city,
    latitude: place.location?.latitude || null,
    longitude: place.location?.longitude || null,
    rating: Number(place.rating),
    user_ratings_total: Number(place.userRatingCount || 0),
    google_types: place.types || [],
    google_maps_uri: place.googleMapsUri || null,
    website_url: place.websiteUri || null,
    phone_number: place.internationalPhoneNumber || null,
    venue_type: category.venueType,
    photo_url: buildPhotoUrl(place),
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
  const body = {
    textQuery: useLocationBias
      ? `best ${category.label} nearby`
      : `best ${category.label} in ${city}`,
    languageCode: 'fr',
    includedType: category.googleType,
    strictTypeFiltering: true,
    minRating: MIN_PRESTIGE_RATING,
    pageSize: 10
  };

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

  return body;
};

const searchCategory = async (city, category, options = {}) => {
  const response = await axios.post(GOOGLE_TEXT_SEARCH_URL, buildSearchBody(city, category, options), {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': FIELD_MASK
    }
  });

  return (response.data.places || [])
    .filter((place) => place?.id && normalizePlaceName(place))
    .filter((place) => Number(place.rating || 0) > MIN_PRESTIGE_RATING)
    .map((place) => toVenue(place, city, category));
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
      categories.map((category) => searchCategory(cleanCity || 'Autour de vous', category, options))
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

const searchUserPartnerDiscovery = async ({
  city,
  latitude,
  longitude,
  radiusKm = 15,
  limit = DEFAULT_LIMIT,
  category = 'ALL'
}) => {
  const normalizedCategory = String(category || 'ALL').trim().toUpperCase();
  const requestedTypes = USER_DISCOVERY_CATEGORY_TYPES[normalizedCategory] || USER_DISCOVERY_CATEGORY_TYPES.ALL;
  const venues = await searchGoogleVenueCandidates(city, requestedTypes, limit, {
    city,
    latitude,
    longitude,
    radiusKm
  });

  return venues.map((venue) => ({
    ...venue,
    id: `google_${venue.google_place_id}`,
    source: 'GOOGLE_PLACES_DIRECT',
    is_user_discovery: true
  }));
};

module.exports = {
  searchVenuesInCity,
  searchUserPartnerDiscovery,
  CATEGORY_QUERIES,
  USER_DISCOVERY_CATEGORY_TYPES,
  MIN_PRESTIGE_RATING
};
