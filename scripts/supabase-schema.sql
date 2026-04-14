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
  phone text,
  photo_review_status text not null default 'APPROVED'
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
  message_type text not null default 'TEXT' check (message_type in ('TEXT', 'IMAGE', 'VIDEO', 'VOICE')),
  media_url text,
  read_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  metadata jsonb default '{}',
  is_read boolean default false
);

-- Events table (analytics/errors)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  event_name text,
  metadata jsonb default '{}',
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
  document_back_url text, -- Added column for back of the ID
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

-- Passes table
create table if not exists public.passes (
  id uuid primary key default gen_random_uuid(),
  passer_id uuid references public.profiles(id) on delete cascade,
  passed_user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (passer_id, passed_user_id)
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
  is_active boolean default true,
  unique (user_id, token)
);

-- Privacy Requests (GDPR/Data deletion)
create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  request_type text not null check (request_type in ('DATA_EXPORT', 'ACCOUNT_DELETION')),
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Communities table
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles(id) on delete set null,
  name text not null unique,
  description text,
  cover_photo text,
  member_count integer default 0,
  created_at timestamp with time zone default now()
);

-- Community Members
create table if not exists public.community_members (
  community_id uuid references public.communities(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null default 'MEMBER' check (role in ('MEMBER', 'MODERATOR', 'ADMIN')),
  joined_at timestamp with time zone default now(),
  primary key (community_id, user_id)
);

-- Community Messages
create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete cascade,
  content text,
  message_type text not null default 'TEXT' check (message_type in ('TEXT', 'IMAGE', 'VIDEO')),
  media_url text,
  created_at timestamp with time zone default now()
);

-- Realtime activation
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.community_messages;

-- Functions
create or replace function public.validate_profile_photos_count()
returns trigger as $$
begin
  if coalesce(array_length(new.photos, 1), 0) not between 3 and 6 then
    raise exception 'profiles must contain between 3 and 6 photos';
  end if;
  return new;
end;
$$ language plpgsql;

create or replace function public.normalize_kyc_verification()
returns trigger as $$
begin
  new.document_type := upper(coalesce(new.document_type, ''));
  new.status := upper(coalesce(new.status, 'PENDING'));

  if new.status in ('APPROVED', 'REJECTED') and new.reviewed_at is null then
    new.reviewed_at := now();
  end if;

  if new.status = 'APPROVED' then
    new.rejection_reason := null;
  end if;

  return new;
end;
$$ language plpgsql;

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

drop trigger if exists validate_profile_photos_count on public.profiles;
create trigger validate_profile_photos_count
  before insert or update on public.profiles
  for each row execute procedure public.validate_profile_photos_count();

drop trigger if exists normalize_kyc_verification on public.kyc_verifications;
create trigger normalize_kyc_verification
  before insert or update on public.kyc_verifications
  for each row execute procedure public.normalize_kyc_verification();

-- Trigger for member count increment
create or replace function public.increment_community_member_count()
returns trigger as $$
begin
  update public.communities
  set member_count = member_count + 1
  where id = new.community_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_community_member_joined on public.community_members;
create trigger on_community_member_joined
  after insert on public.community_members
  for each row execute procedure public.increment_community_member_count();

-- Trigger for member count decrement
create or replace function public.decrement_community_member_count()
returns trigger as $$
begin
  update public.communities
  set member_count = member_count - 1
  where id = old.community_id;
  return old;
end;
$$ language plpgsql;

drop trigger if exists on_community_member_left on public.community_members;
create trigger on_community_member_left
  after delete on public.community_members
  for each row execute procedure public.decrement_community_member_count();
