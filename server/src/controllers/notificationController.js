const { supabase } = require('../config/supabase');

const getNotifications = async (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
  const { data, error } = await supabase
    .from('events')
    .select('id, event_type, event_name, metadata, created_at')
    .in('event_type', ['ADMIN_NOTIFICATION', 'STORY_NOTIFICATION'])
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });

  const notifications = (data || []).map((item) => ({
    ...item,
    is_read: item.metadata?.is_read === true,
  }));
  const unreadCount = notifications.filter((item) => !item.is_read).length;
  res.json({ notifications, unreadCount });
};

const markAsRead = async (req, res) => {
  const id = req.params.id;
  const { data: item } = await supabase.from('events').select('id, user_id, metadata').eq('id', id).maybeSingle();
  if (!item || item.user_id !== req.user.id) return res.status(404).json({ error: 'not_found' });

  const nextMetadata = { ...(item.metadata || {}), is_read: true, read_at: new Date().toISOString() };
  await supabase.from('events').update({ metadata: nextMetadata }).eq('id', id);
  res.json({ success: true });
};

const markAllAsRead = async (req, res) => {
  const { data, error } = await supabase.from('events').select('id, metadata').in('event_type', ['ADMIN_NOTIFICATION', 'STORY_NOTIFICATION']).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });

  const updates = (data || []).map((item) => (
    supabase.from('events').update({
      metadata: { ...(item.metadata || {}), is_read: true, read_at: new Date().toISOString() }
    }).eq('id', item.id)
  ));
  if (updates.length > 0) await Promise.all(updates);
  res.json({ success: true });
};

module.exports = { getNotifications, markAsRead, markAllAsRead };
