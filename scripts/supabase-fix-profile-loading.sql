-- Fix profile loading failures ("Impossible de charger votre profil")
-- Addresses:
-- 1) infinite recursion on public.profiles policies
-- 2) missing subscriptions.payment_method column used by backend
-- Safe to run multiple times.

begin;

-- Ensure backend-required columns exist.
alter table if exists public.subscriptions
  add column if not exists payment_method text default 'PAYSTACK';

update public.subscriptions
set payment_method = 'PAYSTACK'
where payment_method is null;

alter table if exists public.profiles
  add column if not exists is_vip boolean not null default false;

-- Drop legacy/duplicate policies that can conflict or recurse.
drop policy if exists "Profiles are viewable by all authenticated users." on public.profiles;
drop policy if exists "Profiles visibility" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;
drop policy if exists "Users can update their own profile." on public.profiles;

-- Drop helper function signatures to avoid duplicate overloads.
drop function if exists public.has_invisible_mode_access(uuid);
drop function if exists public.has_invisible_mode_access(uuid, text, boolean, timestamptz);
drop function if exists public.has_active_match_with(uuid);

create or replace function public.has_invisible_mode_access(
  target_user_id uuid,
  target_gender text,
  target_is_premium boolean,
  target_trial_started_at timestamptz
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.subscriptions s
    where s.user_id = target_user_id
      and s.status = 'active'
      and s.current_period_end > now()
      and (
        upper(s.plan_id) in ('BIANNUAL', 'ANNUAL')
        or (
          upper(s.plan_id) in ('MONTHLY', 'QUARTERLY')
          and upper(coalesce(target_gender, '')) = 'FEMALE'
          and coalesce(target_is_premium, false) = true
        )
      )
  )
  or (
    upper(coalesce(target_gender, '')) = 'MALE'
    and coalesce(target_is_premium, false) = false
    and target_trial_started_at is not null
    and now() < (target_trial_started_at + interval '7 days')
  );
end;
$$;

create or replace function public.has_active_match_with(target_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.matches m
    where m.status = 'ACTIVE'
      and (
        (m.user_one_id = auth.uid() and m.user_two_id = target_user_id)
        or
        (m.user_two_id = auth.uid() and m.user_one_id = target_user_id)
      )
  );
end;
$$;

create policy "Profiles visibility" on public.profiles
  for select to authenticated
  using (
    suspended_at is null
    and (
      auth.uid() = id
      or (
        onboarding_completed = true
        and (
          -- Profil non invisible
          coalesce(is_invisible, false) = false
          -- Profil invisible mais non éligible à l'option invisible premium
          or not public.has_invisible_mode_access(
            id,
            gender,
            coalesce(is_premium, false),
            trial_started_at
          )
          -- Toujours visible pour un utilisateur déjà en match actif
          or public.has_active_match_with(id)
        )
      )
    )
  );

create policy "Users can update their own profile." on public.profiles
  for update to authenticated
  using (auth.uid() = id and suspended_at is null)
  with check (auth.uid() = id and suspended_at is null);

notify pgrst, 'reload schema';

commit;
