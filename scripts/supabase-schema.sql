-- Base schema for Yamo

create extension if not exists "pgcrypto";

-- Profiles table (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  age integer not null check (age >= 18),
  gender text not null,
  photos text[] not null default '{}',
  bio text default '',
  interests text[] not null default '{}',
  target_gender text[] not null default '{}',
  city text,
  is_verified boolean not null default false,
  is_premium boolean not null default false,
  boosted_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backward-compatible migrations for existing databases
alter table if exists public.profiles
  add column if not exists boosted_until timestamptz;

create index if not exists profiles_city_idx on public.profiles (city);
create index if not exists profiles_boosted_until_idx on public.profiles (boosted_until desc nulls last);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Prevent users from toggling sensitive flags (premium/verified)
create or replace function public.prevent_sensitive_profile_updates()
returns trigger as $$
declare
  jwt_role text;
begin
  jwt_role := current_setting('request.jwt.claim.role', true);
  if jwt_role = 'authenticated' then
    if new.is_premium is distinct from old.is_premium
      or new.is_verified is distinct from old.is_verified
      or new.boosted_until is distinct from old.boosted_until then
      raise exception 'Not allowed to update sensitive flags (premium, verified, boost)';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists prevent_sensitive_profile_updates on public.profiles;
create trigger prevent_sensitive_profile_updates
before update on public.profiles
for each row execute function public.prevent_sensitive_profile_updates();

-- Matches
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_one_id uuid not null references auth.users(id) on delete cascade,
  user_two_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now()
);

create index if not exists matches_user_one_idx on public.matches (user_one_id);
create index if not exists matches_user_two_idx on public.matches (user_two_id);
create unique index if not exists matches_unique_pair on public.matches (user_one_id, user_two_id);

-- Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists messages_match_idx on public.messages (match_id);
create index if not exists messages_sender_idx on public.messages (sender_id);

-- Events (analytics + error monitoring)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  event_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_user_idx on public.events (user_id);
create index if not exists events_type_idx on public.events (event_type);

-- Subscriptions (Paystack)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  plan_id text not null,
  status text not null,
  reference text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_idx on public.subscriptions (user_id);

-- Auto-update updated_at for subscriptions
drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();
