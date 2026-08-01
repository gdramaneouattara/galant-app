const axios = require('axios');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Searches for high-end venues in a specific city using Google Places API (New).
 * @param {string} city - The city name (e.g., "Douala").
 * @param {string[]} types - Array of place types (e.g., ["restaurant", "night_club"]).
 * @returns {Promise<Array>} - List of formatted venues.
 */
const searchVenuesInCity = async (city, types = ['restaurant', 'night_club', 'bar', 'lodging']) => {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('missing_google_maps_api_key');
  }

  const url = 'https://places.googleapis.com/v1/places:searchText';

  // We construct a query like "best restaurants and lounges in Douala"
  const textQuery = `best ${types.join(' and ')} in ${city}`;

  try {
    const response = await axios.post(url, {
      textQuery,
      languageCode: 'fr',
      maxResultCount: 20, // Limit to 20 best results per city
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        // FieldMask is mandatory for the new API to control costs
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.types,places.photos'
      }
    });

    const places = response.data.places || [];

    return places.map(p => {
      // Map Google types to Galant types
      let venue_type = 'RESTAURANT';
      if (p.types.includes('night_club') || p.types.includes('bar')) venue_type = 'LOUNGE';
      if (p.types.includes('lodging')) venue_type = 'HOTEL';

      // Construct photo URL if available
      // Note: In production, you might want to fetch the actual photo URL via places.getPhoto
      // or store the photoReference to fetch it on demand in the client.
      const photoUrl = p.photos && p.photos.length > 0
        ? `https://places.googleapis.com/v1/${p.photos[0].name}/media?key=${GOOGLE_MAPS_API_KEY}&maxWidthProp=800`
        : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800';

      return {
        google_place_id: p.id,
        name: p.displayName.text,
        address: p.formattedAddress,
        city,
        latitude: p.location.latitude,
        longitude: p.location.longitude,
        rating: p.rating || 4.5,
        venue_type,
        photo_url: photoUrl,
        description: `Une adresse d'exception sélectionnée par la Conciergerie Galant à ${city}.`,
        status: 'APPROVED',
        is_editorial: true,
        created_at: new Date().toISOString()
      };
    });
  } catch (error) {
    console.error('Google Places API Error:', error.response?.data || error.message);
    throw new Error('google_places_failed');
  }
};

module.exports = { searchVenuesInCity };
