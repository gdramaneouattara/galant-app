const { getAIRoseNoteSuggestion, translateText } = require('../services/aiService');

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

  const { text, targetLang } = req.body;
  if (!text) return res.status(400).json({ error: 'missing_text' });

  try {
    const translatedText = await translateText(text, targetLang);
    res.json({ translatedText });
  } catch (e) {
    res.status(500).json({ error: 'translation_failed' });
  }
};

module.exports = { getWritingSuggestions, handleTranslation };
