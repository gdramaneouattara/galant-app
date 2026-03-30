const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const {
  PORT = 8787,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  EXPO_PUSH_ACCESS_TOKEN = '',
} = process.env;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const COMMUNITY_ELIGIBLE_PLANS = ['BIANNUAL', 'ANNUAL'];

// --- MIDDLEWARES ---

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_token' });

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: 'invalid_token' });

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, suspended_at, is_premium')
      .eq('id', data.user.id)
      .single();

    if (profile?.suspended_at) return res.status(403).json({ error: 'suspended_account' });

    req.user = {
      id: data.user.id,
      isAdmin: !!profile?.is_admin,
      isPremium: !!profile?.is_premium
    };
    return next();
  } catch (err) {
    return res.status(500).json({ error: 'auth_check_failed' });
  }
};

const sendPushToUser = async ({ userId, title, body, data }) => {
  const { data: tokens } = await supabase.from('push_tokens').select('token').eq('user_id', userId).eq('is_active', true);
  if (!tokens || tokens.length === 0) return;

  const messages = tokens.map((t) => ({ to: t.token, sound: 'default', title, body, data: data || {} }));
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${EXPO_PUSH_ACCESS_TOKEN}` },
      body: JSON.stringify(messages),
    });
  } catch (e) { console.error('Push error', e); }
};

// --- ROUTES MATCHMAKING ---

app.get('/api/matchmaking/suggestions', requireAuth, async (req, res) => {
  const { data: me } = await supabase.from('profiles').select('*').eq('id', req.user.id).single();

  // Filtrage : Exclure Invisible, Admin et Suspendus
  const { data: candidates } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', req.user.id)
    .eq('is_admin', false)
    .eq('is_invisible', false)
    .is('suspended_at', null);

  const { data: likes } = await supabase.from('likes').select('*').eq('liked_id', req.user.id);
  const superLikedMe = new Set((likes || []).filter(l => l.is_super_like).map(l => l.liker_id));

  const now = Date.now();
  const suggestions = (candidates || []).map(c => {
    let score = 0;
    if (c.relationship_goal === me.relationship_goal) score += 30; // Bonus objectif
    if (c.city === me.city) score += 15;
    if (c.boosted_until && new Date(c.boosted_until) > now) score += 50; // Bonus Boost
    if (superLikedMe.has(c.id)) score += 100; // Bonus Super Like reçu

    return { ...c, score, super_liked_me: superLikedMe.has(c.id) };
  }).sort((a, b) => b.score - a.score);

  res.json({ suggestions: suggestions.slice(0, 40) });
});

app.post('/api/matchmaking/swipe', requireAuth, async (req, res) => {
  const { targetUserId, direction, isSuperLike } = req.body;
  if (direction === 'LEFT') return res.json({ matched: false });

  await supabase.from('likes').upsert({ liker_id: req.user.id, liked_id: targetUserId, is_super_like: !!isSuperLike });

  const { data: match } = await supabase.from('likes').select('*').eq('liker_id', targetUserId).eq('liked_id', req.user.id).maybeSingle();

  if (match) {
    const [u1, u2] = [req.user.id, targetUserId].sort();
    await supabase.from('matches').upsert({ user_one_id: u1, user_two_id: u2 });
    void sendPushToUser({ userId: targetUserId, title: 'Nouveau Match ! 💖', body: 'Quelqu\'un a matché avec vous.', data: { type: 'MATCH' } });
    return res.json({ matched: true });
  }

  if (isSuperLike) {
    void sendPushToUser({ userId: targetUserId, title: 'Super Like ! ⭐', body: 'Un profil est très intéressé par vous.', data: { type: 'SUPERLIKE' } });
  }
  res.json({ matched: false });
});

// --- ROUTES MESSAGERIE ---

app.post('/api/messages/send', requireAuth, async (req, res) => {
  const { matchId, content, recipientId } = req.body;
  const { data: msg } = await supabase.from('messages').insert({ match_id: matchId, sender_id: req.user.id, content }).select().single();

  void sendPushToUser({
    userId: recipientId,
    title: 'Nouveau message 💬',
    body: content.length > 50 ? content.substring(0, 47) + '...' : content,
    data: { type: 'MESSAGE', matchId }
  });
  res.json(msg);
});

// --- ROUTES COMMUNAUTÉS ---

app.post('/api/communities/create', requireAuth, async (req, res) => {
  const { name, description, cover_photo } = req.body;
  const { data: sub } = await supabase.from('subscriptions').select('plan_id').eq('user_id', req.user.id).eq('status', 'active').maybeSingle();

  if (!COMMUNITY_ELIGIBLE_PLANS.includes(sub?.plan_id?.toUpperCase())) {
    return res.status(403).json({ error: 'subscription_too_short' });
  }

  const { data: community, error } = await supabase.from('communities').insert({ creator_id: req.user.id, name, description, cover_photo }).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('community_members').insert({ community_id: community.id, user_id: req.user.id, role: 'ADMIN' });
  res.status(201).json(community);
});

app.get('/api/communities', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('communities').select('*').order('member_count', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/communities/:id/messages', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { content, message_type, media_url } = req.body;

  if ((message_type === 'IMAGE' || message_type === 'VIDEO') && !req.user.isPremium) {
    return res.status(403).json({ error: 'premium_required' });
  }

  const { data: msg, error } = await supabase.from('community_messages').insert({ community_id: id, sender_id: req.user.id, content, message_type, media_url }).select('*, profiles(name)').single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(msg);
});

app.get('/api/communities/:id/messages', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('community_messages').select('*, profiles(name)').eq('community_id', req.params.id).order('created_at', { ascending: false }).limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, '0.0.0.0', () => console.log(`Yamo server running on port ${PORT}`));
