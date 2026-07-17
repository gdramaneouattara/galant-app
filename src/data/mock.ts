import { Gender, SubscriptionPlan, User } from '../types';

export const COLORS = {
  primary: '#E11D48', // Rose Red (Galant)
  secondary: '#FB7185', // Lighter rose
  accent: '#9F1239', // Deep rose/wine
  ink: '#0f172a',
  muted: '#64748b',
  bg: '#f8fafc',
};

export const THEMES = {
  light: {
    bg: '#f8fafc',
    card: '#ffffff',
    text: '#0f172a',
    textMuted: '#64748b',
    border: '#e2e8f0',
    input: '#f1f5f9',
    header: '#ffffff',
  },
  dark: {
    bg: '#020617',
    card: '#0f172a',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    border: '#1e293b',
    input: '#1e293b',
    header: '#020617',
  }
};

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Sarah',
    age: 24,
    gender: Gender.FEMALE,
    bio: "Passionnée de photographie et de voyages. À la recherche de quelqu'un de spontané !",
    photos: ['https://picsum.photos/id/1027/600/800', 'https://picsum.photos/id/1011/600/800'],
    interests: ['Photo', 'Voyage', 'Musique'],
    location: { lat: 4.0511, lng: 9.7679, city: 'Douala' },
    isVerified: true,
    isPremium: false,
    likes_count: 0,
    preferences: { targetGender: [Gender.MALE], minAge: 22, maxAge: 35, maxDistance: 50 },
  },
  {
    id: 'u2',
    name: 'Marc',
    age: 28,
    gender: Gender.MALE,
    bio: 'Entrepreneur, amateur de sport et de bonne cuisine.',
    photos: ['https://picsum.photos/id/1005/600/800'],
    interests: ['Business', 'Fitness', 'Cuisine'],
    location: { lat: 3.848, lng: 11.5021, city: 'Yaoundé' },
    isVerified: false,
    isPremium: true,
    likes_count: 0,
    preferences: { targetGender: [Gender.FEMALE], minAge: 20, maxAge: 30, maxDistance: 100 },
  },
  {
    id: 'u3',
    name: 'Elena',
    age: 22,
    gender: Gender.FEMALE,
    bio: "Étudiante en art, j'aime peindre et découvrir de nouveaux cafés.",
    photos: ['https://picsum.photos/id/1012/600/800', 'https://picsum.photos/id/1015/600/800'],
    interests: ['Art', 'Café', 'Lecture'],
    location: { lat: 4.0511, lng: 9.7679, city: 'Douala' },
    isVerified: true,
    isPremium: false,
    likes_count: 0,
    preferences: { targetGender: [Gender.MALE], minAge: 20, maxAge: 30, maxDistance: 20 },
  },
];

export const SUBSCRIPTION_PLANS = [
  { id: SubscriptionPlan.MONTHLY, name: '1 Mois', price: '5 000 FCFA', savings: null },
  { id: SubscriptionPlan.QUARTERLY, name: '3 Mois', price: '10 000 FCFA', savings: 'ÉCONOMISEZ 33%' },
];
