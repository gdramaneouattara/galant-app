const axios = require('axios');

/**
 * Service to handle WhatsApp communications via Meta Cloud API.
 */

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || 'alerte_notification_server';

/**
 * Sends a security alert to a list of contacts.
 * @param {Array} contacts - [{ name, number }]
 * @param {Object} userDetails - { name }
 * @param {Object} meetingDetails - { location, personName, personContact }
 * @param {Object} gpsLocation - { lat, lon }
 */
const sendSecurityAlert = async (contacts, userDetails, meetingDetails, gpsLocation) => {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.warn('⚠️ [WHATSAPP] API not configured. Simulation of alert for:', userDetails.name);
    console.log('--- ALERT CONTENT ---');
    console.log(`User: ${userDetails.name}`);
    console.log(`Location: ${meetingDetails?.location || 'Unknown'}`);
    console.log(`With: ${meetingDetails?.personName || 'Unknown'} (${meetingDetails?.personContact || 'N/A'})`);
    const mapsLink = gpsLocation ? `https://www.google.com/maps?q=${gpsLocation.lat},${gpsLocation.lon}` : 'Non disponible';
    console.log(`GPS: ${mapsLink}`);
    console.log(`Recipients: ${contacts.map(c => c.number).join(', ')}`);
    console.log('---------------------');
    return;
  }

  const url = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const location = meetingDetails?.location || 'Non spécifié';
  const person = meetingDetails?.personName
    ? `${meetingDetails.personName} (${meetingDetails.personContact || 'N/A'})`
    : 'Non spécifiée';

  const mapsLink = gpsLocation
    ? `https://www.google.com/maps?q=${gpsLocation.lat},${gpsLocation.lon}`
    : 'Non disponible';

  for (const contact of contacts) {
    try {
      // Format number: remove + and ensure international format
      const cleanNumber = contact.number.replace(/[^\d]/g, '');

      await axios.post(url, {
        messaging_product: 'whatsapp',
        to: cleanNumber,
        type: 'template',
        template: {
          name: WHATSAPP_TEMPLATE_NAME,
          language: { code: 'fr' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: userDetails.name },
                { type: 'text', text: location },
                { type: 'text', text: person },
                { type: 'text', text: mapsLink }
              ]
            }
          ]
        }
      }, {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`✅ [WHATSAPP] Alert sent to ${contact.name} (${cleanNumber})`);
    } catch (error) {
      console.error(`❌ [WHATSAPP ERROR] Failed to send to ${contact.name}:`, error.response?.data || error.message);
    }
  }
};

module.exports = { sendSecurityAlert };
