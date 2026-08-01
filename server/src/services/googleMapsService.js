const axios = require('axios');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const MIN_PRESTIGE_RATING = 4.0;
const DEFAULT_LIMIT = 20;

const CATEGORY_QUERIES = [
  { googleType: 'restaurant', venueType: 'RESTAURANT', label: 'restaurants gastronomiques' },
  { googleType: 'night_club', venueType: 'LOUNGE', label: 'lounges premium' },
  { googleType: 'bar', venueType: 'LOUNGE', label: 'bars lounge premium' },
  { googleType: 'hotel', venueType: 'HOTEL', label: 'hotels de luxe' }
];

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.types',
  'places.photos'
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

const searchCategory = async (city, category) => {
  const response = await axios.post(GOOGLE_TEXT_SEARCH_URL, {
    textQuery: `best ${category.label} in ${city}`,
    languageCode: 'fr',
    includedType: category.googleType,
    strictTypeFiltering: true,
    minRating: MIN_PRESTIGE_RATING,
    pageSize: 10
  }, {
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

const searchVenuesInCity = async (
  city,
  types = CATEGORY_QUERIES.map((category) => category.googleType),
  limit = DEFAULT_LIMIT
) => {
  if (!GOOGLE_MAPS_API_KEY) throw new Error('missing_google_maps_api_key');

  const cleanCity = String(city || '').trim();
  if (!cleanCity) throw new Error('missing_city');

  try {
    const requestedTypes = new Set((types || []).map(normalizeRequestedType).filter(Boolean));
    const categories = CATEGORY_QUERIES.filter((category) => requestedTypes.has(category.googleType));
    const settled = await Promise.allSettled(
      categories.map((category) => searchCategory(cleanCity, category))
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

module.exports = { searchVenuesInCity, CATEGORY_QUERIES, MIN_PRESTIGE_RATING };
