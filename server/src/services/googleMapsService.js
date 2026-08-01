const axios = require('axios');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const MIN_PRESTIGE_RATING = 4.0;
const DEFAULT_LIMIT = 20;

const CATEGORY_QUERIES = [
  { googleType: 'restaurant', venueType: 'RESTAURANT', label: 'restaurants gastronomiques' },
  { googleType: 'night_club', venueType: 'LOUNGE', label: 'lounges premium' },
  { googleType: 'bar', venueType: 'LOUNGE', label: 'bars lounge premium' },
  { googleType: 'lodging', venueType: 'HOTEL', label: 'hotels de luxe' }
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
    const requestedTypes = new Set((types || []).map((type) => String(type).trim()).filter(Boolean));
    const categories = CATEGORY_QUERIES.filter((category) => requestedTypes.has(category.googleType));
    const batches = await Promise.all(categories.map((category) => searchCategory(cleanCity, category)));
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
    console.error('Google Places API Error:', error.response?.data || error.message);
    throw new Error('google_places_failed');
  }
};

module.exports = { searchVenuesInCity, CATEGORY_QUERIES, MIN_PRESTIGE_RATING };
