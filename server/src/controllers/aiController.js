const { db, rtdb } = require('../config/firebase');
const { getAIRoseNoteSuggestion, translateText } = require('../services/aiService');

const normalizeTranslationLang = (targetLang) => {
  const normalized = String(targetLang || 'fr').toLowerCase().split('-')[0].trim();
  return /^[a-z]{2,8}$/.test(normalized) ? normalized : 'fr';
};

const getCachedTranslation = (message, targetLang) => {
  const translations = message?.metadata?.translations;
  const cached = translations && typeof translations === 'object' ? translations[targetLang] : null;
  return typeof cached === 'string' && cached.trim() ? cached : null;
};

const assertMatchAccess = async (matchId, userId) => {
  const matchDoc = await db.collection('matches').doc(matchId).get();
  if (!matchDoc.exists) {
    const error = new Error('match_not_found');
    error.status = 404;
    throw error;
  }

  const match = matchDoc.data();
  const isParticipant = match.user_one_id === userId || match.user_two_id === userId;
  if (!isParticipant) {
    const error = new Error('unauthorized');
    error.status = 403;
    throw error;
  }

  if (match.status === 'BLOCKED' || match.status === 'UNMATCHED') {
    const error = new Error('conversation_unavailable');
    error.status = 403;
    throw error;
  }
};

const assertVenueChatAccess = async (venueChatId, userId) => {
  const chatDoc = await db.collection('venue_chats').doc(venueChatId).get();
  if (!chatDoc.exists) {
    const error = new Error('chat_not_found');
    error.status = 404;
    throw error;
  }

  const chat = chatDoc.data();
  let isParticipant = chat.user_id === userId || chat.partner_id === userId;

  if (!isParticipant && chat.venue_id) {
    const venueDoc = await db.collection('venues').doc(chat.venue_id).get();
    isParticipant = venueDoc.exists && venueDoc.data().owner_id === userId;
  }

  if (!isParticipant) {
    const error = new Error('unauthorized');
    error.status = 403;
    throw error;
  }
};

const getTranslationMessageContext = async ({ matchId, venueChatId, messageId, userId }) => {
  if (!messageId || (!matchId && !venueChatId)) return null;

  if (matchId) {
    await assertMatchAccess(String(matchId), userId);
    return rtdb.ref(`messages/${matchId}/${messageId}`);
  }

  await assertVenueChatAccess(String(venueChatId), userId);
  return rtdb.ref(`venue_messages/${venueChatId}/${messageId}`);
};

const getWritingSuggestions = async (req, res) => {
  const me = req.user;
  if (!me.is_premium) return res.status(403).json({ error: 'premium_required' });

  const { type, recipientName, interests, lang = 'fr' } = req.body;
  const isEn = String(lang).toLowerCase() === 'en';

  if (type === 'ROSE_NOTE') {
    const suggestions = await getAIRoseNoteSuggestion(recipientName, interests);
    if (isEn) {
       return res.json({ suggestions: suggestions.map(s => `[EN] ${s}`) });
    }
    return res.json({ suggestions });
  }

  if (type === 'BIO_IMPROVEMENT') {
    const { currentBio } = req.body;
    const suggestions = isEn ? [
      `✨ Fan of elegance and courtesy. ${currentBio || 'Passionate about life and great encounters.'} Looking for an authentic connection.`,
      `🌹 On Galant to write a sincere story. ${currentBio || 'Lover of art and gastronomy.'} Elegance is a lifestyle I cultivate daily.`,
      `💎 Gallantry isn't just a word for me. ${currentBio || 'Looking for a partner to explore the city\'s finest places.'}`
    ] : [
      `✨ Adepte de l'élégance et de la courtoisie. ${currentBio || 'Passionné par la vie et les belles rencontres.'} À la recherche d'une connexion authentique.`,
      `🌹 Sur Galant pour écrire une histoire sincère. ${currentBio || 'Amateur d\'art et de gastronomie.'} L'élégance est un art de vivre que je cultive chaque jour.`,
      `💎 La galanterie n'est pas un vain mot pour moi. ${currentBio || 'À la recherche d\'une complice pour explorer les plus beaux lieux de la ville.'}`,
      `🥂 Un esprit curieux et un cœur généreux. ${currentBio || 'J\'apprécie la finesse d\'une bonne discussion et le charme de l\'inattendu.'}`,
      `📸 Regard passionné sur le monde et les gens. ${currentBio || 'Ici pour partager des moments de qualité dans le respect et l\'élégance.'}`,
      `尊 Entre dynamisme et sérénité. ${currentBio || 'Je cherche une personne avec qui chaque sortie devient un événement mémorable.'}`
    ];
    const selected = suggestions.sort(() => 0.5 - Math.random()).slice(0, 3);
    return res.json({ suggestions: selected });
  }

  res.status(400).json({ error: 'invalid_type' });
};

const handleTranslation = async (req, res) => {
  const me = req.user;
  if (!me.is_premium) return res.status(403).json({ error: 'premium_required' });

  const { text, targetLang, matchId, venueChatId, messageId } = req.body;
  const normalizedTargetLang = normalizeTranslationLang(targetLang);

  try {
    const messageRef = await getTranslationMessageContext({
      matchId,
      venueChatId,
      messageId,
      userId: me.id
    });

    if (messageRef) {
      const messageSnap = await messageRef.once('value');
      if (!messageSnap.exists()) return res.status(404).json({ error: 'message_not_found' });

      const message = messageSnap.val();
      const cached = getCachedTranslation(message, normalizedTargetLang);
      if (cached) {
        return res.json({
          translatedText: cached,
          targetLang: normalizedTargetLang,
          cached: true,
          cacheSource: 'rtdb'
        });
      }

      const sourceText = typeof message.content === 'string' && message.content.trim()
        ? message.content
        : String(text || '').trim();

      if (!sourceText) return res.status(400).json({ error: 'missing_text' });

      const translatedText = await translateText(sourceText, normalizedTargetLang);
      await messageRef.update({
        [`metadata/translations/${normalizedTargetLang}`]: translatedText,
        [`metadata/translation_cached_at/${normalizedTargetLang}`]: new Date().toISOString()
      });

      return res.json({
        translatedText,
        targetLang: normalizedTargetLang,
        cached: false,
        cacheSource: 'generated'
      });
    }

    if (!text) return res.status(400).json({ error: 'missing_text' });

    const translatedText = await translateText(text, normalizedTargetLang);
    res.json({ translatedText, targetLang: normalizedTargetLang, cached: false });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    console.error('handleTranslation error:', e);
    res.status(500).json({ error: 'translation_failed' });
  }
};

module.exports = { getWritingSuggestions, handleTranslation };
