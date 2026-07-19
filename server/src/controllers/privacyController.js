const { db, auth } = require('../config/firebase');

const exportData = async (req, res) => {
  const userId = req.user.id;
  const exportedAt = new Date().toISOString();

  const [profileSnap, likesSnap1, likesSnap2, matchesSnap1, matchesSnap2, messagesSnap, subscriptionsSnap] = await Promise.all([
    db.collection('profiles').doc(userId).get(),
    db.collection('likes').where('liker_id', '==', userId).get(),
    db.collection('likes').where('liked_id', '==', userId).get(),
    db.collection('matches').where('user_one_id', '==', userId).get(),
    db.collection('matches').where('user_two_id', '==', userId).get(),
    db.collection('messages').where('sender_id', '==', userId).get(),
    db.collection('subscriptions').where('user_id', '==', userId).get(),
  ]);

  res.json({
    filename: `galant-export-${userId}.json`,
    exported_at: exportedAt,
    format: 'json',
    profile: profileSnap.exists ? profileSnap.data() : null,
    likes: [...likesSnap1.docs, ...likesSnap2.docs].map(d => ({ id: d.id, ...d.data() })),
    matches: [...matchesSnap1.docs, ...matchesSnap2.docs].map(d => ({ id: d.id, ...d.data() })),
    messages: messagesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    subscriptions: subscriptionsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
  });
};

const deleteAccount = async (req, res) => {
  const userId = req.user.id;
  await db.collection('profiles').doc(userId).delete();
  await auth.deleteUser(userId);
  res.json({ success: true });
};

module.exports = { exportData, deleteAccount };
