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
  email?: string | null;
  phone?: string | null;
  name: string;
  age: number;
  gender: Gender;
  bio: string;
  photos: string[];
  interests: string[];
  location: {
    lat: number | null;
    lng: number | null;
    city: string;
    country?: string | null;
  };
  isVerified: boolean;
  isPremium: boolean;
  boosted_until?: string | null;
  relationship_goal?: string | null;
  last_active_at?: string | null;
  likes_count: number;
  is_invisible?: boolean;
  subscription_plan_id?: string | null;
  invisible_mode_eligible?: boolean;
  is_admin?: boolean;
  suspended_at?: string | null;
  photo_review_status?: string | null;
  is_vip?: boolean;
  trial_started_at?: string | null;
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
  type?: 'TEXT' | 'IMAGE' | 'VIDEO';
  message_type?: 'TEXT' | 'IMAGE' | 'VIDEO';
  media_url?: string | null;
  metadata?: Record<string, unknown> | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}
