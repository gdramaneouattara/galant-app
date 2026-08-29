export type ProfileLanguage = 'fr' | 'en';

export type ProfileFactProfile = {
  gender?: string | null;
  relationship_goal?: string | null;
  religion?: string | null;
  religion_other?: string | null;
  city?: string | null;
  country?: string | null;
  is_verified?: boolean | null;
  is_premium?: boolean | null;
  is_vip?: boolean | null;
};

export type ProfileFactItem = {
  key: string;
  label: string;
  value: string;
};

const normalizeCode = (value?: string | null) => String(value || '').trim().toUpperCase();

const LABELS = {
  fr: {
    gender: 'Genre',
    goal: 'Objectif',
    religion: 'Religion',
    location: 'Localisation',
    status: 'Statut',
    unknown: 'Non renseigne',
    male: 'Homme',
    female: 'Femme',
    other: 'Autre',
    serious: 'Amour serieux',
    friendship: 'Amitie',
    networking: 'Reseautage',
    casual: 'On verra bien',
    christian: 'Chretien(ne)',
    muslim: 'Musulman(e)',
    verified: 'Certifie',
    premium: 'Premium',
    vip: 'VIP',
  },
  en: {
    gender: 'Gender',
    goal: 'Goal',
    religion: 'Religion',
    location: 'Location',
    status: 'Status',
    unknown: 'Not provided',
    male: 'Man',
    female: 'Woman',
    other: 'Other',
    serious: 'Serious relationship',
    friendship: 'Friendship',
    networking: 'Networking',
    casual: "Let's see",
    christian: 'Christian',
    muslim: 'Muslim',
    verified: 'Verified',
    premium: 'Premium',
    vip: 'VIP',
  },
} as const;

export const getGenderLabel = (gender?: string | null, language: ProfileLanguage = 'fr') => {
  const labels = LABELS[language] || LABELS.fr;
  const code = normalizeCode(gender);
  if (code === 'MALE') return labels.male;
  if (code === 'FEMALE') return labels.female;
  if (code === 'OTHER') return labels.other;
  return gender || labels.unknown;
};

export const getRelationshipGoalLabel = (goal?: string | null, language: ProfileLanguage = 'fr') => {
  const labels = LABELS[language] || LABELS.fr;
  const code = normalizeCode(goal);
  if (code === 'SERIOUS') return labels.serious;
  if (code === 'FRIENDSHIP') return labels.friendship;
  if (code === 'NETWORKING') return labels.networking;
  if (code === 'CASUAL') return labels.casual;
  return goal || labels.unknown;
};

export const getReligionLabel = (
  religion?: string | null,
  religionOther?: string | null,
  language: ProfileLanguage = 'fr'
) => {
  const labels = LABELS[language] || LABELS.fr;
  const code = normalizeCode(religion);
  if (code === 'CHRISTIAN') return labels.christian;
  if (code === 'MUSLIM') return labels.muslim;
  if (code === 'OTHER') return religionOther?.trim() || labels.other;
  return religion || labels.unknown;
};

export const getLocationLabel = (profile: ProfileFactProfile, language: ProfileLanguage = 'fr') => {
  const labels = LABELS[language] || LABELS.fr;
  return [profile.city, profile.country].filter(Boolean).join(', ') || labels.unknown;
};

export const getProfileFactItems = (
  profile: ProfileFactProfile,
  language: ProfileLanguage = 'fr',
  options: { includeLocation?: boolean; includeStatus?: boolean } = {}
): ProfileFactItem[] => {
  const labels = LABELS[language] || LABELS.fr;
  const items: ProfileFactItem[] = [
    { key: 'gender', label: labels.gender, value: getGenderLabel(profile.gender, language) },
    { key: 'relationship_goal', label: labels.goal, value: getRelationshipGoalLabel(profile.relationship_goal, language) },
    { key: 'religion', label: labels.religion, value: getReligionLabel(profile.religion, profile.religion_other, language) },
  ];

  if (options.includeLocation) {
    items.push({ key: 'location', label: labels.location, value: getLocationLabel(profile, language) });
  }

  if (options.includeStatus) {
    const status = [
      profile.is_vip ? labels.vip : null,
      profile.is_premium ? labels.premium : null,
      profile.is_verified ? labels.verified : null,
    ].filter(Boolean).join(' / ');
    if (status) items.push({ key: 'status', label: labels.status, value: status });
  }

  return items.filter(item => item.value && item.value !== labels.unknown);
};
