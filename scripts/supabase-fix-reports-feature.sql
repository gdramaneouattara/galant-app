-- Finalize report feature (block/report moderation pipeline)
-- Safe to run multiple times in Supabase SQL Editor.

begin;

create extension if not exists "pgcrypto";

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

alter table if exists public.reports add column if not exists reporter_id uuid references public.profiles(id) on delete set null;
alter table if exists public.reports add column if not exists reported_user_id uuid references public.profiles(id) on delete set null;
alter table if exists public.reports add column if not exists reason text not null default 'GENERAL';
alter table if exists public.reports add column if not exists details text;
alter table if exists public.reports add column if not exists status text not null default 'PENDING';
alter table if exists public.reports add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;
alter table if exists public.reports add column if not exists reviewed_at timestamp with time zone;
alter table if exists public.reports add column if not exists created_at timestamp with time zone default now();
alter table if exists public.reports add column if not exists updated_at timestamp with time zone default now();

create index if not exists reports_reporter_id_idx on public.reports (reporter_id);
create index if not exists reports_reported_user_id_idx on public.reports (reported_user_id);
create index if not exists reports_status_idx on public.reports (status);

do $$
begin
  begin
    alter table public.reports drop constraint if exists reports_reason_check;
  exception when undefined_table then
    null;
  end;

  begin
    alter table public.reports add constraint reports_reason_check check (
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
    );
  exception when duplicate_object then
    null;
  end;

  begin
    alter table public.reports drop constraint if exists reports_status_check;
  exception when undefined_table then
    null;
  end;

  begin
    alter table public.reports add constraint reports_status_check check (
      status in ('PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED')
    );
  exception when duplicate_object then
    null;
  end;
end
$$;

alter table if exists public.reports enable row level security;

drop policy if exists "Users can create reports" on public.reports;
create policy "Users can create reports" on public.reports
  for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and reported_user_id <> auth.uid()
  );

drop policy if exists "Users can read own reports" on public.reports;
create policy "Users can read own reports" on public.reports
  for select to authenticated
  using (reporter_id = auth.uid());

drop policy if exists "Admins can read all reports" on public.reports;
create policy "Admins can read all reports" on public.reports
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true and p.suspended_at is null
    )
  );

drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports" on public.reports
  for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true and p.suspended_at is null
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true and p.suspended_at is null
    )
  );

commit;
