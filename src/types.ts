export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum SubscriptionPlan {
  FREE = 'FREE',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  BIANNUAL = 'BIANNUAL',
  ANNUAL = 'ANNUAL',
}

export interface User {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  bio: string;
  photos: string[];
  interests: string[];
  location: {
    lat: number;
    lng: number;
    city: string;
  };
  isVerified: boolean;
  isPremium: boolean;
  preferences: {
    targetGender: Gender[];
    minAge: number;
    maxAge: number;
    maxDistance: number;
  };
}

export interface Match {
  id: string;
  user_one_id: string;
  user_two_id: string;
  status: string;
  created_at: string;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}
