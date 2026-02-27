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
  is_invisible boolean not null default false,
  is_admin boolean not null default false,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backward-compatible migrations for existing databases
alter table if exists public.profiles
  add column if not exists boosted_until timestamptz;
alter table if exists public.profiles
  add column if not exists is_invisible boolean not null default false;
alter table if exists public.profiles
  add column if not exists is_admin boolean not null default false;
alter table if exists public.profiles
  add column if not exists suspended_at timestamptz;

create index if not exists profiles_city_idx on public.profiles (city);
create index if not exists profiles_boosted_until_idx on public.profiles (boosted_until desc nulls last);
create index if not exists profiles_invisible_idx on public.profiles (is_invisible, is_premium);

-- Eligibility helper: invisible mode is reserved for active 6/12 month plans.
create or replace function public.has_invisible_mode_access(target_user_id uuid)
returns boolean
language plpgsql
stable
as $$
declare
  eligible boolean := false;
begin
  if to_regclass('public.subscriptions') is null then
    return false;
  end if;

  execute $sql$
    select exists (
      select 1
      from public.subscriptions s
      where s.user_id = $1
        and s.status = 'active'
        and upper(coalesce(s.plan_id, '')) in ('BIANNUAL', 'ANNUAL')
        and (s.current_period_end is null or s.current_period_end > now())
    )
  $sql$
  into eligible
  using target_user_id;

  return coalesce(eligible, false);
end;
$$;

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

-- Prevent users from toggling sensitive flags
create or replace function public.prevent_sensitive_profile_updates()
returns trigger as $$
declare
  jwt_role text;
begin
  jwt_role := current_setting('request.jwt.claim.role', true);
  if jwt_role = 'authenticated' then
    if new.is_premium is distinct from old.is_premium
      or new.is_verified is distinct from old.is_verified
      or new.boosted_until is distinct from old.boosted_until
      or new.is_admin is distinct from old.is_admin
      or new.suspended_at is distinct from old.suspended_at then
      raise exception 'Not allowed to update sensitive flags';
    end if;
    if new.is_invisible is distinct from old.is_invisible
      and new.is_invisible = true
      and not public.has_invisible_mode_access(new.id) then
      raise exception 'Invisible mode is available for 6-month and annual plans only';
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

create or replace function public.normalize_match_pair()
returns trigger as $$
declare
  tmp uuid;
begin
  if new.user_one_id = new.user_two_id then
    raise exception 'A match requires two distinct users';
  end if;

  if new.user_one_id > new.user_two_id then
    tmp := new.user_one_id;
    new.user_one_id := new.user_two_id;
    new.user_two_id := tmp;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists normalize_match_pair on public.matches;
create trigger normalize_match_pair
before insert or update on public.matches
for each row execute function public.normalize_match_pair();

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

create or replace function public.prevent_unsafe_message_updates()
returns trigger as $$
declare
  jwt_role text;
begin
  jwt_role := current_setting('request.jwt.claim.role', true);

  if jwt_role = 'authenticated' then
    if new.match_id is distinct from old.match_id
      or new.sender_id is distinct from old.sender_id
      or new.created_at is distinct from old.created_at then
      raise exception 'Not allowed to modify immutable message fields';
    end if;

    if auth.uid() is distinct from old.sender_id then
      if new.content is distinct from old.content then
        raise exception 'Not allowed to edit another user message';
      end if;
      if old.is_read = true and new.is_read = false then
        raise exception 'Not allowed to mark message as unread';
      end if;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists prevent_unsafe_message_updates on public.messages;
create trigger prevent_unsafe_message_updates
before update on public.messages
for each row execute function public.prevent_unsafe_message_updates();

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
