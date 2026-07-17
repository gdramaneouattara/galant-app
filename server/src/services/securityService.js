const { db } = require('../config/firebase');
const { sendPushNotification } = require('./notificationService');

/**
 * Enregistre une connexion admin et alerte si l'appareil est nouveau
 */
const trackAdminLogin = async (userId, userAgent, ip) => {
  try {
    const adminRef = db.collection('profiles').doc(userId);
    const adminDoc = await adminRef.get();

    if (!adminDoc.exists || !adminDoc.data().is_admin) return;

    const deviceHash = Buffer.from(userAgent + ip).toString('base64');
    const knownDevicesRef = db.collection('admin_security').doc(userId).collection('known_devices');
    const deviceDoc = await knownDevicesRef.doc(deviceHash).get();

    if (!deviceDoc.exists) {
      // Nouvel appareil détecté !
      console.warn(`⚠️ [SECURITY] Nouvelle connexion Admin détectée pour ${userId} (IP: ${ip})`);

      // 1. Enregistrer le nouvel appareil
      await knownDevicesRef.doc(deviceHash).set({
        user_agent: userAgent,
        ip: ip,
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString()
      });

      // 2. Envoyer une alerte (Push et Log)
      void sendPushNotification(userId, "Alerte de Sécurité 🛡️", "Une nouvelle connexion à votre compte Admin a été détectée. S'il ne s'agit pas de vous, sécurisez votre compte immédiatement.", { type: 'SECURITY_ALERT' });

      // 3. Ajouter au journal d'audit
      await db.collection('admin_audit_logs').add({
        admin_id: userId,
        action: 'NEW_DEVICE_LOGIN',
        metadata: { ip, user_agent: userAgent },
        created_at: new Date().toISOString()
      });
    } else {
      // Appareil connu, on met juste à jour la date
      await knownDevicesRef.doc(deviceHash).update({
        last_seen_at: new Date().toISOString()
      });
    }
  } catch (e) {
    console.error('[Security Service Error]', e.message);
  }
};

module.exports = { trackAdminLogin };
