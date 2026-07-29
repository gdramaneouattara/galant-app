const { db } = require('../config/firebase');

/**
 * Rapidly check photo validity via simulated AI.
 * In a real scenario, this would call Google Vision API or Rekognition.
 */
const checkPhotos = async (req, res) => {
  const { photoUrls } = req.body;
  const me = req.user;

  if (!photoUrls || !Array.isArray(photoUrls)) {
    return res.status(400).json({ error: 'missing_photo_urls' });
  }

  try {
    // 1. Simulate AI analysis delay
    console.log(`[MODERATION] Analyzing ${photoUrls.length} photos for user ${me.id}...`);

    // 2. Logic: For now, we approve everything unless it's a known placeholder
    // (This is where you'd put real safe-search logic)
    const isRejected = photoUrls.some(url => url.includes('rejected_test_marker'));

    if (isRejected) {
      return res.json({
        status: 'REJECTED',
        reason: 'inappropriate_content',
        message: "Désolé, cette photo ne respecte pas les critères d'élégance et de courtoisie de Galant."
      });
    }

    // 3. Log the check
    await db.collection('moderation_logs').add({
      user_id: me.id,
      action: 'PHOTO_CHECK',
      count: photoUrls.length,
      status: 'APPROVED',
      created_at: new Date().toISOString()
    });

    res.json({ status: 'APPROVED' });
  } catch (error) {
    console.error('[MODERATION ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { checkPhotos };
