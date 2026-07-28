const { db } = require('../config/firebase');

/**
 * Schedules a security check-in.
 */
const scheduleCheckIn = async (req, res) => {
  const { durationMinutes, contactName, contactNumber } = req.body;
  const me = req.user;

  if (!durationMinutes) return res.status(400).json({ error: 'missing_duration' });

  try {
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

    const logRef = await db.collection('security_logs').add({
      user_id: me.id,
      user_name: me.name,
      status: 'PENDING',
      expires_at: expiresAt,
      contact_info: {
        name: contactName || 'Contact de confiance',
        number: contactNumber || ''
      },
      created_at: new Date().toISOString()
    });

    res.json({ success: true, logId: logRef.id, expiresAt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Confirms the user is safe and cancels the check-in.
 */
const confirmSafety = async (req, res) => {
  const { logId } = req.body;
  const meId = req.user.id;

  try {
    const logRef = db.collection('security_logs').doc(logId);
    const log = await logRef.get();

    if (!log.exists) return res.status(404).json({ error: 'log_not_found' });
    if (log.data().user_id !== meId) return res.status(403).json({ error: 'unauthorized' });

    await logRef.update({
      status: 'CONFIRMED',
      confirmed_at: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Triggers an immediate SOS alert.
 */
const triggerImmediateSOS = async (req, res) => {
  const { contactName, contactNumber } = req.body;
  const me = req.user;

  try {
    const logRef = await db.collection('security_logs').add({
      user_id: me.id,
      user_name: me.name,
      status: 'SOS_IMMEDIAT',
      triggered_at: new Date().toISOString(),
      contact_info: {
        name: contactName || 'Contact d\'Urgence',
        number: contactNumber || ''
      },
      created_at: new Date().toISOString()
    });

    console.warn(`‼️ [SOS] Immediate alert triggered by ${me.name} (${me.id})`);

    res.json({ success: true, logId: logRef.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { scheduleCheckIn, confirmSafety, triggerImmediateSOS };
