const { supabase } = require('../config/supabase');

const exportData = async (req, res) => {
  const userId = req.user.id;
  const exportedAt = new Date().toISOString();

  const [profileRes, likesRes, matchesRes, messagesRes, subscriptionsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('likes').select('*').or(`liker_id.eq.${userId},liked_id.eq.${userId}`),
    supabase.from('matches').select('*').or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`),
    supabase.from('messages').select('*').eq('sender_id', userId),
    supabase.from('subscriptions').select('*').eq('user_id', userId),
  ]);

  res.json({
    filename: `galant-export-${userId}.json`,
    exported_at: exportedAt,
    format: 'json',
    profile: profileRes.data || null,
    likes: likesRes.data || [],
    matches: matchesRes.data || [],
    messages: messagesRes.data || [],
    subscriptions: subscriptionsRes.data || [],
  });
};

const deleteAccount = async (req, res) => {
  const userId = req.user.id;
  await supabase.from('profiles').delete().eq('id', userId);
  await supabase.auth.admin.deleteUser(userId);
  res.json({ success: true });
};

module.exports = { exportData, deleteAccount };
