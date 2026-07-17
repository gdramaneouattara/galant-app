const { db } = require('../config/firebase');

const getMyKycStatus = async (req, res) => {
  const userId = req.user.id;
  try {
    const snapshot = await db.collection('kyc_verifications')
      .where('user_id', '==', userId)
      .orderBy('created_at', 'desc')
      .get();

    const mapped = snapshot.docs.map((doc) => {
      const row = doc.data();
      return {
        id: doc.id,
        status: row.status,
        document_type: row.document_type,
        submitted_at: row.submitted_at || row.created_at,
        reviewed_at: row.reviewed_at || null,
        rejection_reason: row.rejection_reason || null,
      };
    });

    res.json({ is_verified: !!req.user.is_verified, current: mapped[0] || null, history: mapped });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const submitKycRequest = async (req, res) => {
  const { documentType, documentFront, documentBack, selfie } = req.body;
  try {
    const data = {
      user_id: req.user.id,
      document_type: documentType,
      document_url: documentFront,
      document_back_url: documentBack,
      selfie_url: selfie,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };
    const ref = await db.collection('kyc_verifications').add(data);
    res.json({ id: ref.id, ...data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getMyKycStatus, submitKycRequest };
