-- Base schema for Yamo

create extension if not exists "pgcrypto";

-- Profiles table (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  age integer not null check (age >= 18),
  gender text not null,
  bio text,
  photos text[] default '{}',
  location geography(point) not null,
  is_premium boolean default false,
  is_admin boolean default false,
  is_verified boolean default false,
  is_kyc_verified boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  last_online_at timestamp with time zone default now(),
  suspended_at timestamp with time zone
);

-- Interests table
create table if not exists public.interests (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  category text not null,
  created_at timestamp with time zone default now()
);

-- User Interests (Many-to-Many)
create table if not exists public.user_interests (
  user_id uuid references public.profiles(id) on delete cascade,
  interest_id uuid references public.interests(id) on delete cascade,
  primary key (user_id, interest_id)
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
  type text not null default 'TEXT' check (type in ('TEXT', 'IMAGE', 'VIDEO', 'VOICE')),
  media_url text,
  read_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Events table (analytics/errors)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  payload jsonb default '{}',
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

-- Photo review queue
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
  selfie_url text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone default now()
);

-- Subscriptions table
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  plan_id text not null,
  status text not null,
  current_period_start timestamp with time zone not null,
  current_period_end timestamp with time zone not null,
  cancel_at_period_end boolean default false,
  created_at timestamp with time zone default now()
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

-- Blocks table
create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  blocked_user_id uuid references public.profiles(id) on delete cascade,
  reason text,
  created_at timestamp with time zone default now(),
  unique (user_id, blocked_user_id)
);

-- Reports table
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'PENDING' check (status in ('PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED')),
  created_at timestamp with time zone default now()
);

-- Push tokens
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamp with time zone default now(),
  unique (user_id, token)
);

-- Privacy Requests (GDPR/Data deletion)
create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  request_type text not null check (request_type in ('DATA_EXPORT', 'ACCOUNT_DELETION')),
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Functions
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, age, gender, location)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    (new.raw_user_meta_data->>'age')::integer,
    new.raw_user_meta_data->>'gender',
    st_setsrid(st_makepoint(
      (new.raw_user_meta_data->>'longitude')::float,
      (new.raw_user_meta_data->>'latitude')::float
    ), 4326)
  );
  return new;
end;
$$ language plpgsql security definer;

-- Triggers
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
