-- Fix signup failure: "Database error saving new user"
-- Safe to run multiple times.
-- Run in Supabase SQL Editor on the target project.

begin;

-- 1) Ensure required extensions exist.
create extension if not exists "pgcrypto";
create extension if not exists postgis;

-- 2) Ensure public.profiles exists (minimum shape required by app + trigger).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  onboarding_completed boolean not null default false,
  trial_started_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3) Ensure columns expected by trigger / app exist even on partially migrated DBs.
alter table if exists public.profiles add column if not exists name text;
alter table if exists public.profiles add column if not exists onboarding_completed boolean not null default false;
alter table if exists public.profiles add column if not exists trial_started_at timestamp with time zone default now();
alter table if exists public.profiles add column if not exists created_at timestamp with time zone default now();
alter table if exists public.profiles add column if not exists updated_at timestamp with time zone default now();

-- 4) (Re)create the trigger function used by auth signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, onboarding_completed, trial_started_at, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Utilisateur'),
    false,
    now(),
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
exception
  when others then
    -- Do not block auth user creation because of profile bootstrap issues.
    raise warning 'handle_new_user failed for auth.users.id=%: %', new.id, sqlerrm;
    return new;
end;
$$;

-- 5) Ensure trigger is present and bound to auth.users.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- 6) Ensure realtime publication includes profiles when available.
do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    begin
      alter publication supabase_realtime add table public.profiles;
    exception
      when duplicate_object then
        null;
    end;
  end if;
end
$$;

-- 7) Cleanup duplicated RLS policies (safe/idempotent).
-- Profiles
drop policy if exists "Users insert own profile" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;
drop policy if exists "Profiles are viewable by all authenticated users." on public.profiles;

-- Reports
drop policy if exists "Users can create reports." on public.reports;
drop policy if exists "Users can view their own reports." on public.reports;
drop policy if exists "Admins can view all reports." on public.reports;
drop policy if exists "Admins can review reports." on public.reports;

commit;
