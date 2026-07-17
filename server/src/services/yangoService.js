/**
 * Service de pont vers les API Yango (Ride & Food)
 * Permet d'intégrer les services de transport et livraison dans Galant.
 */

const YANGO_API_KEY = process.env.YANGO_API_KEY; // À renseigner dans .env

/**
 * Récupère une estimation de prix et de temps pour un trajet
 */
const getRideEstimate = async (startLat, startLon, endLat, endLon) => {
  // Ici on appellera l'API réelle de Yango
  // En attendant, on retourne une structure de données prête pour l'UI
  return {
    success: true,
    provider: 'YANGO',
    estimate: {
      price: 1500,
      currency: 'XAF',
      time_minutes: 4,
      service_class: 'Premium'
    },
    deep_link: `yango://order?start_lat=${startLat}&start_lon=${startLon}&end_lat=${endLat}&end_lon=${endLon}`
  };
};

/**
 * Récupère les restaurants partenaires Yango Food à proximité d'un lieu
 */
const getFoodPartners = async (lat, lon) => {
  return {
    success: true,
    stores: [
      { id: 'yfood_1', name: 'Le Majestic - Yango Deli', rating: 4.5, delivery_time: '20-30 min' }
    ]
  };
};

module.exports = { getRideEstimate, getFoodPartners };
