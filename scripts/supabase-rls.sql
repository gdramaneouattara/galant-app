-- RLS Activation
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchased_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.community_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.super_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kyc_verifications ENABLE ROW LEVEL SECURITY;

-- 1. Helper function for invisible mode
-- IMPORTANT: do not query public.profiles from this function, otherwise
-- "Profiles visibility" policy can recurse infinitely on profiles SELECT.
-- Drop legacy policies first because they may depend on old function signatures.
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by all authenticated users." ON public.profiles;
DROP POLICY IF EXISTS "Profiles visibility" ON public.profiles;

DROP FUNCTION IF EXISTS public.has_invisible_mode_access(uuid);
DROP FUNCTION IF EXISTS public.has_invisible_mode_access(uuid, text, boolean, timestamptz);

CREATE OR REPLACE FUNCTION public.has_invisible_mode_access(
  target_user_id uuid,
  target_gender text,
  target_is_premium boolean,
  target_trial_started_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN exists (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.user_id = target_user_id
      AND s.status = 'active'
      AND s.current_period_end > now()
      AND (
        upper(s.plan_id) IN ('BIANNUAL', 'ANNUAL')
        OR (
          upper(s.plan_id) in ('MONTHLY', 'QUARTERLY')
          AND upper(coalesce(target_gender, '')) = 'FEMALE'
          AND coalesce(target_is_premium, false) = true
        )
      )
  )
  OR (
    upper(coalesce(target_gender, '')) = 'MALE'
    AND coalesce(target_is_premium, false) = false
    AND target_trial_started_at IS NOT NULL
    AND now() < (target_trial_started_at + interval '7 days')
  );
END;
$$;

-- 2. Profiles Policies
CREATE POLICY "Profiles visibility" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    suspended_at IS NULL
    AND (
      auth.uid() = id
      OR (
        onboarding_completed = true
        AND (
          NOT (
            is_invisible = true
            AND public.has_invisible_mode_access(
              id,
              gender,
              coalesce(is_premium, false),
              trial_started_at
            )
          )
          OR exists (
            select 1
            from public.matches m
            where m.status = 'ACTIVE'
              and (
                (m.user_one_id = auth.uid() and m.user_two_id = profiles.id)
                or
                (m.user_two_id = auth.uid() and m.user_one_id = profiles.id)
              )
          )
        )
      )
    )
  );

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Messages & Matches Policies
DROP POLICY IF EXISTS "Users view own matches" ON public.matches;
CREATE POLICY "Users view own matches" ON public.matches
  FOR SELECT TO authenticated
  USING (auth.uid() = user_one_id OR auth.uid() = user_two_id);

DROP POLICY IF EXISTS "Users read messages in matches" ON public.messages;
CREATE POLICY "Users read messages in matches" ON public.messages
  FOR SELECT TO authenticated
  USING (
    exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (auth.uid() = m.user_one_id or auth.uid() = m.user_two_id)
    )
  );

-- 4. Monetization Policies
DROP POLICY IF EXISTS "Users view own purchases" ON public.purchased_interactions;
CREATE POLICY "Users view own purchases" ON public.purchased_interactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users view own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
CREATE POLICY "Users can create reports" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND reported_user_id <> auth.uid()
  );

DROP POLICY IF EXISTS "Users can read own reports" ON public.reports;
CREATE POLICY "Users can read own reports" ON public.reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Admins can read all reports" ON public.reports;
CREATE POLICY "Admins can read all reports" ON public.reports
  FOR SELECT TO authenticated
  USING (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins can update reports" ON public.reports
  FOR UPDATE TO authenticated
  USING (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true and p.suspended_at is null
    )
  )
  WITH CHECK (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true and p.suspended_at is null
    )
  );

-- 5. Security Trigger (Protecting Admin & Premium flags)
CREATE OR REPLACE FUNCTION public.prevent_sensitive_profile_updates()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'authenticated' THEN
    IF new.is_premium IS DISTINCT FROM old.is_premium
      OR new.is_admin IS DISTINCT FROM old.is_admin
      OR new.is_vip IS DISTINCT FROM old.is_vip
      OR new.suspended_at IS DISTINCT FROM old.suspended_at THEN
      RAISE EXCEPTION 'Action non autorisée sur les champs de privilèges.';
    END IF;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS tr_prevent_sensitive_updates ON public.profiles;
CREATE TRIGGER tr_prevent_sensitive_updates
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_sensitive_profile_updates();
