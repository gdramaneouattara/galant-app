const { db } = require('../config/firebase');

const getCommunities = async (req, res) => {
  try {
    const snapshot = await db.collection('communities').orderBy('created_at', 'desc').get();
    const communities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const communityIds = communities.map((c) => c.id);
    if (communityIds.length === 0) return res.json([]);

    // Member counts and my memberships
    const [membersSnap, myMembershipsSnap] = await Promise.all([
      db.collection('community_members').get(), // Small base optimization
      db.collection('community_members').where('user_id', '==', req.user.id).get(),
    ]);

    const memberCountByCommunity = {};
    membersSnap.docs.forEach(doc => {
      const row = doc.data();
      memberCountByCommunity[row.community_id] = (memberCountByCommunity[row.community_id] || 0) + 1;
    });

    const myMembershipSet = new Set(myMembershipsSnap.docs.map(doc => doc.data().community_id));

    res.json(communities.map((community) => ({
      ...community,
      member_count: memberCountByCommunity[community.id] || 0,
      is_member: myMembershipSet.has(community.id),
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createCommunity = async (req, res) => {
  const planKey = String(req.subscription?.plan_id || '').toUpperCase();
  if (!['BIANNUAL', 'ANNUAL', 'PRESTIGE'].includes(planKey)) return res.status(403).json({ error: 'premium_required' });

  const { name, description, cover_photo } = req.body;
  try {
    const communityData = {
      name,
      description,
      cover_photo,
      creator_id: req.user.id,
      created_at: new Date().toISOString()
    };
    const communityRef = await db.collection('communities').add(communityData);

    await db.collection('community_members').doc(`${communityRef.id}_${req.user.id}`).set({
      community_id: communityRef.id,
      user_id: req.user.id,
      role: 'ADMIN',
      joined_at: new Date().toISOString()
    });

    res.json({ id: communityRef.id, ...communityData, member_count: 1, is_member: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const joinCommunity = async (req, res) => {
  const { communityId } = req.params;
  try {
    await db.collection('community_members').doc(`${communityId}_${req.user.id}`).set({
      community_id: communityId,
      user_id: req.user.id,
      role: 'MEMBER',
      joined_at: new Date().toISOString()
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const leaveCommunity = async (req, res) => {
  const { communityId } = req.params;
  try {
    await db.collection('community_members').doc(`${communityId}_${req.user.id}`).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCommunityMessages = async (req, res) => {
  const { communityId } = req.params;
  try {
    const snapshot = await db.collection('community_messages')
      .where('community_id', '==', communityId)
      .orderBy('created_at', 'asc')
      .get();

    const messages = await Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data();
      const profileDoc = await db.collection('profiles').doc(data.sender_id).get();
      return {
        id: doc.id,
        ...data,
        profiles: profileDoc.exists() ? { name: profileDoc.data().name, photos: profileDoc.data().photos } : null
      };
    }));

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const sendCommunityMessage = async (req, res) => {
  const { communityId } = req.params;
  const { content, message_type, media_url } = req.body;
  try {
    const memberDoc = await db.collection('community_members').doc(`${communityId}_${req.user.id}`).get();
    if (!memberDoc.exists) return res.status(403).json({ error: 'community_membership_required' });

    const messageData = {
      community_id: communityId,
      sender_id: req.user.id,
      content: content || '',
      message_type: message_type || 'TEXT',
      media_url: media_url || null,
      created_at: new Date().toISOString()
    };
    const messageRef = await db.collection('community_messages').add(messageData);
    res.json({ id: messageRef.id, ...messageData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCommunityMembers = async (req, res) => {
  const { communityId } = req.params;
  try {
    const snapshot = await db.collection('community_members')
      .where('community_id', '==', communityId)
      .orderBy('joined_at', 'asc')
      .get();

    const members = await Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data();
      const profileDoc = await db.collection('profiles').doc(data.user_id).get();
      const profile = profileDoc.exists() ? {
        name: profileDoc.data().name,
        photos: profileDoc.data().photos,
        is_verified: profileDoc.data().is_verified,
        is_premium: profileDoc.data().is_premium
      } : null;
      return { ...data, profiles: profile };
    }));

    res.json({ members });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getCommunities, createCommunity, joinCommunity, leaveCommunity, getCommunityMessages, sendCommunityMessage, getCommunityMembers };
