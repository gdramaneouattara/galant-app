-- RLS: Profiles (Trial & VIP)
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS trial_started_at timestamptz default now();
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS is_vip boolean default false;

-- Protect sensitive profile flags
CREATE OR REPLACE FUNCTION public.check_profile_sensitive_updates()
RETURNS trigger AS $$
BEGIN
  IF (new.is_admin IS DISTINCT FROM old.is_admin) THEN
    RAISE EXCEPTION 'Not allowed to update is_admin flag';
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_profile_sensitive_updates ON public.profiles;
CREATE TRIGGER tr_check_profile_sensitive_updates
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.check_profile_sensitive_updates();

-- RLS: super_likes
ALTER TABLE IF EXISTS public.super_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view super likes they are involved in." ON public.super_likes;
CREATE POLICY "Users can view super likes they are involved in."
  ON public.super_likes FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Only recipients can respond to super likes." ON public.super_likes;
CREATE POLICY "Only recipients can respond to super likes."
  ON public.super_likes FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- RLS: purchased_interactions
ALTER TABLE IF EXISTS public.purchased_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own purchases." ON public.purchased_interactions;
CREATE POLICY "Users can view their own purchases."
  ON public.purchased_interactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS: Statuses (Updated for Men viewing / Women posting)
ALTER TABLE IF EXISTS public.statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active statuses." ON public.statuses;
CREATE POLICY "Anyone can view active statuses."
  ON public.statuses FOR SELECT
  TO authenticated
  USING (
    expires_at > now()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Women can post statuses." ON public.statuses;
CREATE POLICY "Women can post statuses."
  ON public.statuses FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          p.gender = 'FEMALE'
          OR (p.gender = 'MALE' AND p.trial_started_at > now() - interval '7 days')
        )
        and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Users can delete their own statuses." ON public.statuses;
CREATE POLICY "Users can delete their own statuses."
  ON public.statuses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
