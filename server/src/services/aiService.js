const analyzeMessageWithAI = async (text) => {
  if (!text) return { isSafe: true };
  const toxicKeywords = ['merde', 'connard', 'salope', 'idiot', 'enculé', 'pute'];
  const isToxic = toxicKeywords.some(kw => text.toLowerCase().includes(kw));

  if (isToxic) {
    return {
      isSafe: false,
      reason: 'inappropriate_content',
      suggestion: "Pour rester dans l'esprit Galant, préférez une formulation plus courtoise et respectueuse."
    };
  }
  return { isSafe: true };
};

const getAIRoseNoteSuggestion = async (recipientName, interests) => {
  const mainInterest = interests && interests.length > 0 ? interests[0] : null;

  const generalTemplates = [
    `Bonjour ${recipientName}, votre profil dégage une élégance rare. Seriez-vous ouvert à faire connaissance ?`,
    `Une rose pour saluer votre charisme, ${recipientName}. J'aimerais beaucoup en découvrir davantage sur vous.`,
    `${recipientName}, votre sourire a illuminé mon flux Galant. Ravi de vous rencontrer ici.`
  ];

  const interestTemplates = {
    'Voyage': [
      `Passionné de voyages comme vous, ${recipientName} ! Quelle est la prochaine destination sur votre liste ?`,
      `Bonjour ${recipientName}, j'ai adoré vos photos d'évasion. Un pays vous a-t-il particulièrement marqué ?`,
      `Ravi de croiser une exploratrice comme vous, ${recipientName}. Quel est votre plus beau souvenir d'aventure ?`
    ],
    'Cuisine': [
      `Une fine bouche à ce que je vois, ${recipientName} ! Quelle est votre adresse gastronomique préférée en ville ?`,
      `Bonjour ${recipientName}, ravi de voir que vous appréciez la bonne table. Plutôt saveurs locales ou cuisine du monde ?`,
      `Votre passion pour la gastronomie a attiré mon attention, ${recipientName}. Au plaisir d'échanger sur nos péchés mignons.`
    ],
    'Gastronomie': [
      `Ravi de croiser un épicurien tel que vous, ${recipientName}. Avez-vous une préférence pour les vins ou les grands crus ?`,
      `Bonjour ${recipientName}, votre goût pour la haute gastronomie m'a interpellé. Un restaurant à me recommander ?`,
      `L'art de la table semble vous tenir à cœur, ${recipientName}. Je serais ravi de discuter de vos plus belles découvertes culinaires.`
    ],
    'Mode': [
      `Votre sens du style est remarquable, ${recipientName}. Une marque ou un créateur qui vous inspire particulièrement ?`,
      `Bonjour ${recipientName}, j'ai beaucoup aimé l'élégance de vos tenues. La mode est-elle pour vous un moyen d'expression ?`,
      `Ravi de croiser une personne avec autant de goût, ${recipientName}. Seriez-vous partante pour échanger sur les dernières tendances ?`
    ],
    'Business': [
      `L'ambition et l'entrepreneuriat sont des valeurs que je partage, ${recipientName}. Sur quel type de projet travaillez-vous ?`,
      `Bonjour ${recipientName}, ravi de voir un esprit aussi dynamique. Comment conciliez-vous vie active et moments de détente ?`,
      `${recipientName}, votre profil respire le succès. Au plaisir d'échanger avec une personne aussi déterminée.`
    ],
    'Tech': [
      `Toujours à l'affût des dernières innovations, ${recipientName} ? Quel est le gadget ou la tech qui a changé votre quotidien ?`,
      `Bonjour ${recipientName}, ravi de croiser un profil tourné vers le futur. Suivez-vous l'actualité de l'IA avec intérêt ?`,
      `${recipientName}, une rose pour votre curiosité technologique. Au plaisir de discuter des nouveautés qui vous passionnent.`
    ],
    'Musique': [
      `Bonjour ${recipientName}, quels sont les morceaux qui tournent en boucle chez vous en ce moment ?`,
      `Mélomane comme vous, ${recipientName}. Quel est le dernier concert qui vous a fait vibrer ?`,
      `Une rose pour souligner votre goût musical. Seriez-vous partante pour une sortie jazzy un de ces soirs ?`
    ],
    'Cinéma': [
      `Passionnée de septième art, ${recipientName} ? Quel film a le plus marqué votre esprit récemment ?`,
      `Bonjour ${recipientName}, ravi de croiser une cinéphile. Plutôt grands classiques ou blockbusters spectaculaires ?`,
      `${recipientName}, j'ai vu que vous aimiez le cinéma. Une série coup de cœur à me conseiller en ce moment ?`
    ],
    'Lecture': [
      `Ravi de croiser une lectrice assidue, ${recipientName}. Quel est le livre qui a changé votre vision du monde ?`,
      `Bonjour ${recipientName}, votre intérêt pour la littérature m'a beaucoup plu. Quel genre de récits vous transporte le plus ?`,
      `Une rose pour votre esprit cultivé, ${recipientName}. Seriez-vous ouverte à discuter de vos auteurs favoris ?`
    ],
    'Gaming': [
      `Une joueuse passionnée sur Galant, ${recipientName} ? Sur quelle plateforme passez-vous le plus de temps ?`,
      `Bonjour ${recipientName}, ravi de voir que vous appréciez l'univers du jeu. Un titre qui vous occupe en ce moment ?`,
      `${recipientName}, une rose pour votre côté ludique. Plutôt jeux d'aventure ou défis compétitifs ?`
    ],
    'Danse': [
      `Ravi de voir votre passion pour la danse, ${recipientName}. Quel style vous fait vibrer sur la piste ?`,
      `Bonjour ${recipientName}, votre énergie est magnifique. Pratiquez-vous la danse depuis longtemps ?`,
      `${recipientName}, une rose pour votre grâce. On dit souvent que la danse est le langage de l'âme, qu'en pensez-vous ?`
    ],
    'Nature': [
      `Bonjour ${recipientName}, ravi de voir une amoureuse du grand air. Quelle est votre escapade naturelle préférée ?`,
      `La beauté des paysages semble vous toucher, ${recipientName}. Plutôt balade en forêt ou coucher de soleil sur la plage ?`,
      `${recipientName}, une rose pour votre authenticité. Au plaisir de discuter de vos moments de reconnexion avec la nature.`
    ],
    'Yoga': [
      `Ravi de voir que vous cultivez la sérénité, ${recipientName}. Pratiquez-vous le yoga pour l'équilibre du corps ou de l'esprit ?`,
      `Bonjour ${recipientName}, votre quête de bien-être m'a interpellé. Avez-vous une routine matinale préférée ?`,
      `${recipientName}, une rose pour votre zénitude. Au plaisir d'échanger avec une personne aussi apaisée.`
    ],
    'Sorties': [
      `Toujours prête pour une nouvelle aventure, ${recipientName} ? Quelle est votre idée d'une soirée parfaite en ville ?`,
      `Bonjour ${recipientName}, ravi de voir un profil aussi social. Avez-vous une adresse secrète à faire découvrir ?`,
      `${recipientName}, une rose pour votre dynamisme. Seriez-vous partante pour explorer un nouveau lieu partenaire Galant ?`
    ],
    'Bien-être': [
      `Bonjour ${recipientName}, ravi de voir que vous prenez soin de vous. Quel est votre rituel de détente ultime ?`,
      `Le bien-être semble être une priorité pour vous, ${recipientName}. Plutôt spa relaxant ou retraite de méditation ?`,
      `${recipientName}, une rose pour votre douceur. Au plaisir de discuter de vos secrets pour garder le sourire.`
    ],
    'Sport': [
      `Ravi de voir votre dynamisme, ${recipientName} ! Quel défi sportif vous anime en ce moment ?`,
      `Bonjour ${recipientName}, votre énergie est communicative. Pratiquez-vous une discipline en particulier ?`,
      `${recipientName}, une rose pour saluer votre détermination. Quel est votre secret pour garder une telle forme ?`
    ],
    'Art': [
      `Votre sensibilité artistique m'a beaucoup plu, ${recipientName}. Avez-vous une galerie ou une expo favorite ?`,
      `Bonjour ${recipientName}, ravi de croiser une âme créative. Quelle forme d'art vous touche le plus ?`,
      `Une rose pour votre univers élégant, ${recipientName}. Au plaisir de discuter de vos inspirations.`
    ],
    'Photo': [
      `Vos clichés sont magnifiques, ${recipientName}. Quel est votre sujet de prédilection derrière l'objectif ?`,
      `Bonjour ${recipientName}, j'ai beaucoup aimé votre regard sur le monde. Photographiez-vous à l'instinct ?`,
      `${recipientName}, une rose pour votre talent visuel. J'aimerais beaucoup en savoir plus sur votre passion.`
    ]
  };

  let specific = [];
  if (mainInterest && interestTemplates[mainInterest]) {
    specific = interestTemplates[mainInterest];
  }

  // Combine and shuffle
  const pool = [...specific, ...generalTemplates].sort(() => 0.5 - Math.random());
  return pool.slice(0, 3);
};

const translateText = async (text, targetLang) => {
  const mockTranslations = {
    'bonjour': 'hello',
    'salut': 'hi',
    'comment vas-tu ?': 'how are you?',
    'ca va ?': 'how are you?',
    'tu es magnifique': 'you are beautiful',
    'merci': 'thank you',
    'a bientot': 'see you soon',
    'enchanté': 'nice to meet you',
    'hello': 'bonjour',
    'how are you?': 'comment vas-tu ?',
    'you are beautiful': 'tu es magnifique',
    'thank you': 'merci',
  };

  const lowerText = String(text || '').toLowerCase().trim();
  let translated = mockTranslations[lowerText];

  if (!translated) {
    const prefix = String(targetLang).toUpperCase() === 'EN' ? '[Translated to EN] ' : '[Traduit en FR] ';
    translated = prefix + text;
  }
  return translated;
};

module.exports = { analyzeMessageWithAI, getAIRoseNoteSuggestion, translateText };
