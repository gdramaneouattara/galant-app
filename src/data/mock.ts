import { Gender, SubscriptionPlan, User } from '../types';

export const COLORS = {
  primary: '#E94057',
  secondary: '#F27121',
  accent: '#8A2387',
  ink: '#0f172a',
  muted: '#64748b',
  bg: '#f8fafc',
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
    preferences: { targetGender: [Gender.MALE], minAge: 20, maxAge: 30, maxDistance: 20 },
  },
];

export const SUBSCRIPTION_PLANS = [
  { id: SubscriptionPlan.MONTHLY, name: '1 Mois', price: '3 000 FCFA', savings: null },
  { id: SubscriptionPlan.QUARTERLY, name: '3 Mois', price: '9 000 FCFA', savings: '0%' },
  { id: SubscriptionPlan.BIANNUAL, name: '6 Mois', price: '15 000 FCFA', savings: '17%' },
  { id: SubscriptionPlan.ANNUAL, name: '1 An', price: '30 000 FCFA', savings: '20%' },
];
