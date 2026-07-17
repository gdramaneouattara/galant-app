export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum SubscriptionPlan {
  FREE = 'FREE',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
}

export type AppThemePreference = 'light' | 'dark' | 'system';
export type Language = 'fr' | 'en';

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
  city?: string | null;
  country?: string | null;
  location: {
    lat: number | null;
    lng: number | null;
    city: string;
    country?: string | null;
  };
  isVerified: boolean;
  isPremium: boolean;
  boosted_until?: string | null;
  golden_rose_until?: string | null;
  relationship_goal?: string | null;
  last_active_at?: string | null;
  likes_count: number;
  roses_count?: number;
  galanterie_score?: number;
  galanterie_ratings_count?: number;
  is_invisible?: boolean;
  subscription_plan_id?: string | null;
  invisible_mode_eligible?: boolean;
  is_admin?: boolean;
  suspended_at?: string | null;
  photo_review_status?: string | null;
  is_vip?: boolean;
  is_partner?: boolean;
  trial_started_at?: string | null;
  passport_city?: string | null;
  passport_country?: string | null;
  passport_latitude?: number | null;
  passport_longitude?: number | null;
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
  type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'VOICE' | 'VENUE_SUGGESTION' | 'EVENT_SUGGESTION';
  message_type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'VOICE' | 'VENUE_SUGGESTION' | 'EVENT_SUGGESTION';
  media_url?: string | null;
  metadata?: Record<string, unknown> | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export type TranslationKeys = "welcome" | "welcome_subtitle" | "create_account" | "login" | "partner_signup" | "discover" | "discover_subtitle" | "stories" | "agenda" | "agenda_subtitle" | "guide" | "guide_subtitle" | "messages" | "messages_subtitle" | "profile" | "premium_join" | "premium_subtitle" | "ai_assistant_title" | "ai_assistant_desc" | "visibility_boost_title" | "visibility_boost_desc" | "invisible_mode_title" | "invisible_mode_desc" | "certified_badge_title" | "certified_badge_desc" | "save_33" | "best_choice" | "itinerary" | "chat_host" | "rose_box" | "likes_received" | "settings" | "appearance" | "language" | "logout" | "detect_location" | "coordinates_captured" | "ai_nudge" | "rank_insight" | "propel" | "unlocked" | "locked" | "unlock" | "reply_free" | "buy_dm" | "vocal_serenade" | "scented_note" | "subscriptions" | "boosts" | "roses" | "matches" | "search_placeholder" | "no_more_profiles" | "match_title" | "match_sub" | "continue" | "step_x_of_y" | "my_bio" | "i_am_looking_for" | "account_settings" | "verify_identity" | "become_premium" | "download_my_data" | "delete_my_account" | "active" | "inactive" | "premium_member" | "free_model" | "boosted_profile" | "write_message" | "ai_help" | "online" | "offline" | "view_profile" | "one_listen_only" | "played" | "sent" | "translate" | "translating" | "show_original" | "translation_premium_only" | "all" | "gastronomy" | "nightlife" | "beauty" | "attentions" | "culture" | "flash_offer" | "instant_moment" | "propose_match" | "join_guide" | "partner_footer" | "no_venue_found" | "suggestions_for_you" | "all_venues" | "results" | "today" | "tomorrow" | "sent_success" | "suggestion_sent" | "plan_locked" | "plan_restricted_female" | "success" | "premium_active" | "payment_pending" | "payment_validation" | "error" | "purchase_unavailable" | "google_play_error" | "no_offers_found" | "app_store_active" | "google_play_active" | "comparison_title" | "comparison_subtitle" | "service" | "boost_your_profile" | "boost_subtitle" | "already_boosted" | "remaining" | "free_boost_available" | "free_boost_subtitle" | "activate" | "boost_activated" | "free_boost_success" | "one_month" | "three_months" | "one_day" | "three_days" | "seven_days" | "premium_desc" | "boost_1d_desc" | "boost_3d_desc" | "boost_7d_desc" | "day" | "days" | "hour" | "hours" | "about" | "no_description" | "no_benefit" | "chat_error" | "gallant_benefit" | "buy_rose" | "rose_bouquet" | "send_rose_desc" | "add_scented_note" | "write_mot_doux" | "per_bouquet" | "maybe_later" | "ai_assistant_exclusive" | "ai_error" | "ai_error_desc" | "golden_rose_title" | "golden_rose_desc" | "session_of_glory" | "discover_grid" | "profiles_visible" | "boost_rank" | "loading_suggestions" | "no_profiles_to_show" | "reload" | "your_position" | "boost_grid_desc" | "you" | "boosted_position" | "score" | "city_not_set" | "passport_galant" | "passport_desc" | "passport_benefit_1" | "passport_benefit_2" | "passport_benefit_3" | "activate_passport" | "deactivate_passport" | "search_city" | "select_city" | "passport_active_at" | "join_elite" | "subscription_expiry_reminder_title" | "subscription_expiry_reminder_body" | "subscription_expired_title" | "subscription_expired_body" | "prolong_privilege" | "expires_in" | "partner_visibility" | "partner_prestige" | "partner_plan_desc" | "partner_visibility_price" | "partner_prestige_price" | "partner_certified_badge" | "priority_listing" | "unlimited_agenda" | "proximity_push" | "partner_stats" | "manage_subscription" | "partner_trial_active" | "partner_trial_expires" | "upgrade_to_keep_privileges";
