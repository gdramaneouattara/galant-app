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
ALTER TABLE IF EXISTS public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kyc_verifications ENABLE ROW LEVEL SECURITY;

-- 1. Helper function for invisible mode
CREATE OR REPLACE FUNCTION public.has_invisible_mode_access(target_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN exists (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = target_user_id
      AND s.status = 'active'
      AND upper(s.plan_id) IN ('BIANNUAL', 'ANNUAL')
      AND s.current_period_end > now()
  );
END;
$$;

-- 2. Profiles Policies
DROP POLICY IF EXISTS "Profiles visibility" ON public.profiles;
CREATE POLICY "Profiles visibility" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    suspended_at IS NULL
    AND (
      auth.uid() = id
      OR (
        onboarding_completed = true
        AND NOT (is_invisible = true AND public.has_invisible_mode_access(id))
      )
    )
  );

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
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
