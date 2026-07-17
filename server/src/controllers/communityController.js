const { supabase } = require('../config/supabase');

const getCommunities = async (req, res) => {
  const { data: communities, error } = await supabase.from('communities').select('id, name, description, cover_photo, creator_id').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  const communityIds = (communities || []).map((c) => c.id);
  if (communityIds.length === 0) return res.json([]);

  const [{ data: members }, { data: myMemberships }] = await Promise.all([
    supabase.from('community_members').select('community_id, user_id').in('community_id', communityIds),
    supabase.from('community_members').select('community_id').in('community_id', communityIds).eq('user_id', req.user.id),
  ]);

  const memberCountByCommunity = {};
  for (const row of (members || [])) memberCountByCommunity[row.community_id] = (memberCountByCommunity[row.community_id] || 0) + 1;
  const myMembershipSet = new Set((myMemberships || []).map((row) => row.community_id));

  res.json((communities || []).map((community) => ({
    ...community,
    member_count: memberCountByCommunity[community.id] || 0,
    is_member: myMembershipSet.has(community.id),
  })));
};

const createCommunity = async (req, res) => {
  const planKey = String(req.subscription?.plan_id || '').toUpperCase();
  if (!['BIANNUAL', 'ANNUAL', 'PRESTIGE'].includes(planKey)) return res.status(403).json({ error: 'premium_required' });

  const { name, description, cover_photo } = req.body;
  const { data: community, error } = await supabase.from('communities').insert({ name, description, cover_photo, creator_id: req.user.id }).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('community_members').upsert({ community_id: community.id, user_id: req.user.id, role: 'ADMIN' });
  res.json({ ...community, member_count: 1, is_member: true });
};

const joinCommunity = async (req, res) => {
  const { communityId } = req.params;
  const { error } = await supabase.from('community_members').upsert({ community_id: communityId, user_id: req.user.id, role: 'MEMBER' });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};

const leaveCommunity = async (req, res) => {
  const { communityId } = req.params;
  const { error } = await supabase.from('community_members').delete().eq('community_id', communityId).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};

const getCommunityMessages = async (req, res) => {
  const { communityId } = req.params;
  const { data, error } = await supabase.from('community_messages').select('id, content, message_type, media_url, created_at, sender_id, profiles:sender_id(name, photos)').eq('community_id', communityId).order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
};

const sendCommunityMessage = async (req, res) => {
  const { communityId } = req.params;
  const { content, message_type, media_url } = req.body;
  const { data: membership } = await supabase.from('community_members').select('user_id').eq('community_id', communityId).eq('user_id', req.user.id).maybeSingle();
  if (!membership) return res.status(403).json({ error: 'community_membership_required' });

  const { data, error } = await supabase.from('community_messages').insert({ community_id: communityId, sender_id: req.user.id, content: content || '', message_type: message_type || 'TEXT', media_url: media_url || null }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const getCommunityMembers = async (req, res) => {
  const { communityId } = req.params;
  const { data, error } = await supabase.from('community_members').select('user_id, role, joined_at, profiles:user_id(name, photos, is_verified, is_premium)').eq('community_id', communityId).order('joined_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ members: data || [] });
};

module.exports = { getCommunities, createCommunity, joinCommunity, leaveCommunity, getCommunityMessages, sendCommunityMessage, getCommunityMembers };
