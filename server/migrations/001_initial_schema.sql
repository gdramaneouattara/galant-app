-- Base schema for Galant (Final Consolidated Version)

create extension if not exists "pgcrypto";
create extension if not exists postgis;

-- Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  age integer check (age >= 18),
  gender text check (gender in ('MALE', 'FEMALE', 'OTHER')),
  bio text,
  photos text[] default '{}',
  location geography(point),
  latitude double precision,
  longitude double precision,
  interests text[] default '{}',
  is_premium boolean default false,
  is_admin boolean default false,
  is_verified boolean default false,
  is_kyc_verified boolean default false,
  relationship_goal text,
  city text,
  country text,
  target_gender text[] default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  last_online_at timestamp with time zone default now(),
  last_active_at timestamp with time zone default now(),
  suspended_at timestamp with time zone,
  is_invisible boolean default false,
  likes_count integer default 0,
  roses_count integer default 0,
  galanterie_score float default 5.0,
  galanterie_ratings_count integer default 0,
  phone text,
  photo_review_status text not null default 'APPROVED',
  onboarding_completed boolean not null default false,
  trial_started_at timestamp with time zone default now(),
  is_vip boolean default false,
  is_partner boolean default false,
  boosted_until timestamp with time zone,
  golden_rose_until timestamp with time zone
);

-- Subscriptions table
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  plan_id text not null,
  status text not null,
  payment_method text default 'PAYSTACK', -- 'PAYSTACK' or 'GOOGLE_PLAY'
  current_period_start timestamp with time zone default now(),
  current_period_end timestamp with time zone not null,
  cancel_at_period_end boolean default false,
  created_at timestamp with time zone default now()
);

-- Purchased interactions (Pay-per-action history)
create table if not exists public.purchased_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  interaction_type text not null check (interaction_type in ('SUPER_LIKE', 'DIRECT_MESSAGE', 'BOOST')),
  target_id uuid, -- user_id for DM/SuperLike
  reference text unique,
  price_amount integer not null,
  currency text default 'XOF',
  provider text not null default 'PAYSTACK',
  created_at timestamp with time zone default now()
);

-- Daily usage tracking (Quotas)
create table if not exists public.daily_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  action_type text not null check (action_type in ('SUPER_LIKE', 'INVISIBLE_VIEW', 'STATUS_VIEW', 'BOOST_TIME', 'HIDE_SEEN_TIME')),
  usage_count integer default 0,
  usage_seconds integer default 0,
  action_date date default current_date,
  unique(user_id, action_type, action_date)
);

-- Likes table
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  liker_id uuid references public.profiles(id) on delete cascade,
  liked_id uuid references public.profiles(id) on delete cascade,
  is_super_like boolean default false,
  created_at timestamp with time zone default now(),
  unique (liker_id, liked_id)
);

-- Matches table
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_one_id uuid references public.profiles(id) on delete cascade,
  user_two_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'UNMATCHED', 'BLOCKED')),
  created_at timestamp with time zone default now(),
  unique (user_one_id, user_two_id),
  check (user_one_id < user_two_id)
);

-- Messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete cascade,
  content text,
  message_type text not null default 'TEXT' check (message_type in ('TEXT', 'IMAGE', 'VIDEO', 'VOICE')),
  media_url text,
  read_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  metadata jsonb default '{}',
  is_read boolean default false
);

-- Statuses table
create table if not exists public.statuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  content text,
  media_url text,
  message_type text not null default 'TEXT' check (message_type in ('TEXT', 'IMAGE', 'VIDEO')),
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone default (now() + interval '24 hours')
);

-- Story/Status likes
create table if not exists public.status_likes (
  id uuid primary key default gen_random_uuid(),
  status_id uuid not null references public.statuses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (status_id, user_id)
);

create index if not exists status_likes_status_id_idx on public.status_likes (status_id);
create index if not exists status_likes_user_id_idx on public.status_likes (user_id);

-- Communities
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  cover_photo text,
  creator_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now()
);

create table if not exists public.community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'MEMBER' check (role in ('MEMBER', 'MODERATOR', 'ADMIN')),
  joined_at timestamp with time zone default now(),
  unique (community_id, user_id)
);

create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  message_type text not null default 'TEXT' check (message_type in ('TEXT', 'IMAGE', 'VIDEO')),
  media_url text,
  created_at timestamp with time zone default now()
);

-- Super Likes table (Inbox & Tracking)
create table if not exists public.super_likes (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'IGNORED')),
  note text,
  reference text unique,
  price_amount integer not null default 500,
  currency text not null default 'XOF',
  provider text not null default 'INTERNAL',
  responded_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique (sender_id, recipient_id),
  check (sender_id <> recipient_id)
);

-- Reports (Block/Report moderation pipeline)
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  reported_user_id uuid references public.profiles(id) on delete set null,
  reason text not null default 'GENERAL' check (
    reason in (
      'GENERAL',
      'FAKE_PROFILE',
      'HARASSMENT',
      'SPAM',
      'SCAM',
      'INAPPROPRIATE_CONTENT',
      'VIOLENCE',
      'OTHER'
    )
  ),
  details text,
  status text not null default 'PENDING' check (status in ('PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  check (reporter_id is null or reported_user_id is null or reporter_id <> reported_user_id)
);

create index if not exists reports_reporter_id_idx on public.reports (reporter_id);
create index if not exists reports_reported_user_id_idx on public.reports (reported_user_id);
create index if not exists reports_status_idx on public.reports (status);

-- Privacy Requests
create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  request_type text not null check (request_type in ('DATA_EXPORT', 'ACCOUNT_DELETION')),
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Admin audit logs
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_id uuid,
  target_type text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamp with time zone default now()
);

-- Photo review queue (Legacy/Internal)
create table if not exists public.photo_review_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  photo_url text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone default now()
);

-- KYC verifications
create table if not exists public.kyc_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  document_type text not null check (document_type in ('PASSPORT', 'ID_CARD', 'DRIVERS_LICENSE')),
  document_url text not null,
  document_back_url text,
  selfie_url text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone default now()
);

create unique index if not exists kyc_verifications_one_open_request_per_user_idx
  on public.kyc_verifications (user_id)
  where status in ('PENDING', 'IN_REVIEW');

-- Realtime activation
do $$
begin
  if not exists (select 1 from pg_publication_rel pr join pg_class c on c.oid = pr.prrelid join pg_namespace n on n.oid = c.relnamespace join pg_publication p on p.oid = pr.prpubid where p.pubname = 'supabase_realtime' and n.nspname = 'public' and c.relname = 'matches') then
    alter publication supabase_realtime add table public.matches;
  end if;
  if not exists (select 1 from pg_publication_rel pr join pg_class c on c.oid = pr.prrelid join pg_namespace n on n.oid = c.relnamespace join pg_publication p on p.oid = pr.prpubid where p.pubname = 'supabase_realtime' and n.nspname = 'public' and c.relname = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (select 1 from pg_publication_rel pr join pg_class c on c.oid = pr.prrelid join pg_namespace n on n.oid = c.relnamespace join pg_publication p on p.oid = pr.prpubid where p.pubname = 'supabase_realtime' and n.nspname = 'public' and c.relname = 'statuses') then
    alter publication supabase_realtime add table public.statuses;
  end if;
end;
$$;

-- Golden Roses (Ultra-visibility)
create table if not exists public.golden_roses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

create index if not exists golden_roses_expires_at_idx on public.golden_roses (expires_at);

-- Partner Venues (Guide des Rendez-vous)
create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  venue_type text check (venue_type in ('RESTAURANT', 'CAFE', 'BAR', 'CLUB', 'FLORIST', 'PARK', 'HAIR_MALE', 'HAIR_FEMALE', 'OTHER')),
  city text not null,
  description text,
  address text,
  benefit_description text, -- e.g. "Un cocktail offert pour les membres Galant"
  photo_url text,
  latitude double precision,
  longitude double precision,
  status text default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- Venue Analytics (Tracking clicks/views)
create table if not exists public.venue_analytics (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now()
);

create index if not exists venue_analytics_venue_id_idx on public.venue_analytics (venue_id);

-- Venue Chats (User to Business interaction)
create table if not exists public.venue_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (user_id, venue_id)
);

-- Messages table updated to support venue chats
alter table public.messages add column if not exists venue_chat_id uuid references public.venue_chats(id) on delete cascade;

-- Venue Events (L'Agenda Galant)
create table if not exists public.venue_events (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  title text not null,
  description text,
  photo_url text,
  event_type text not null check (event_type in ('EVENT', 'FLASH_OFFER')),
  starts_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create index if not exists venue_events_expires_at_idx on public.venue_events (expires_at);

-- Trigger Functions
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, onboarding_completed, trial_started_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Utilisateur'),
    false,
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Apply Triggers
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Super Like Count Trigger
create or replace function public.handle_super_like_increment()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.profiles
  set roses_count = roses_count + 1
  where id = new.recipient_id;
  return new;
end;
$$;

drop trigger if exists on_super_like_created on public.super_likes;
create trigger on_super_like_created
after insert on public.super_likes
for each row execute procedure public.handle_super_like_increment();

-- Behavior Ratings Table
create table if not exists public.behavior_ratings (
  id uuid primary key default gen_random_uuid(),
  rater_id uuid references public.profiles(id) on delete cascade,
  rated_id uuid references public.profiles(id) on delete cascade,
  score integer check (score >= 1 and score <= 5),
  category text check (category in ('RESPECTFUL', 'GENTLEMAN', 'REACTIVE', 'FUN', 'DISAPPOINTING')),
  comment text,
  created_at timestamp with time zone default now(),
  unique (rater_id, rated_id)
);

-- Events / Notifications Table
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  event_type text not null, -- e.g. 'ADMIN_NOTIFICATION', 'STORY_NOTIFICATION'
  event_name text not null,
  metadata jsonb default '{}',
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

create index if not exists events_user_id_idx on public.events (user_id);
create index if not exists events_event_type_idx on public.events (event_type);

-- Function to update profile score
create or replace function public.handle_new_behavior_rating()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.profiles
  set
    galanterie_score = (
      select avg(score)::float
      from public.behavior_ratings
      where rated_id = new.rated_id
    ),
    galanterie_ratings_count = (
      select count(*)
      from public.behavior_ratings
      where rated_id = new.rated_id
    )
  where id = new.rated_id;
  return new;
end;
$$;

create trigger on_behavior_rating_added
after insert or update on public.behavior_ratings
for each row execute procedure public.handle_new_behavior_rating();


