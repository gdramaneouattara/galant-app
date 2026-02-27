-- RLS: Profiles
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean not null default false;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS is_premium boolean not null default false;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS boosted_until timestamptz;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean not null default false;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS is_invisible boolean not null default false;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_invisible_mode_access(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  eligible boolean := false;
BEGIN
  IF to_regclass('public.subscriptions') IS NULL THEN
    RETURN false;
  END IF;

  EXECUTE $sql$
    SELECT exists (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.user_id = $1
        AND s.status = 'active'
        AND upper(coalesce(s.plan_id, '')) IN ('BIANNUAL', 'ANNUAL')
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
    )
  $sql$
  INTO eligible
  USING target_user_id;

  RETURN coalesce(eligible, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_sensitive_profile_updates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := current_setting('request.jwt.claim.role', true);
  IF jwt_role = 'authenticated' THEN
    IF new.is_premium IS DISTINCT FROM old.is_premium
      OR new.is_verified IS DISTINCT FROM old.is_verified
      OR new.boosted_until IS DISTINCT FROM old.boosted_until
      OR new.is_admin IS DISTINCT FROM old.is_admin
      OR new.suspended_at IS DISTINCT FROM old.suspended_at THEN
      RAISE EXCEPTION 'Not allowed to update sensitive flags';
    END IF;
    IF new.is_invisible IS DISTINCT FROM old.is_invisible
      AND new.is_invisible = true
      AND NOT public.has_invisible_mode_access(new.id) THEN
      RAISE EXCEPTION 'Invisible mode is available for 6-month and annual plans only';
    END IF;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS prevent_sensitive_profile_updates ON public.profiles;
CREATE TRIGGER prevent_sensitive_profile_updates
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_sensitive_profile_updates();

DROP POLICY IF EXISTS "Profiles are viewable by all authenticated users." ON public.profiles;
CREATE POLICY "Profiles are viewable by all authenticated users."
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    suspended_at IS NULL
    AND (
      auth.uid() = id
      OR (
        is_admin = false
        AND NOT (is_invisible = true AND public.has_invisible_mode_access(id))
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND is_premium = false
    AND is_verified = false
    AND boosted_until IS NULL
    AND is_admin = false
    AND suspended_at IS NULL
    AND is_invisible = false
  );

DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id AND suspended_at IS NULL)
  WITH CHECK (
    auth.uid() = id
    AND suspended_at IS NULL
    AND (is_invisible = false OR public.has_invisible_mode_access(id))
  );

DROP POLICY IF EXISTS "Users can delete their own profile." ON public.profiles;
CREATE POLICY "Users can delete their own profile."
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id AND suspended_at IS NULL);

-- RLS: Matches
ALTER TABLE IF EXISTS public.matches ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.normalize_match_pair()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  tmp uuid;
BEGIN
  IF new.user_one_id = new.user_two_id THEN
    RAISE EXCEPTION 'A match requires two distinct users';
  END IF;

  IF new.user_one_id > new.user_two_id THEN
    tmp := new.user_one_id;
    new.user_one_id := new.user_two_id;
    new.user_two_id := tmp;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS normalize_match_pair ON public.matches;
CREATE TRIGGER normalize_match_pair
BEFORE INSERT OR UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.normalize_match_pair();

DROP POLICY IF EXISTS "Users can view their matches." ON public.matches;
CREATE POLICY "Users can view their matches."
  ON public.matches FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = user_one_id OR auth.uid() = user_two_id)
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Users can create matches involving themselves." ON public.matches;
CREATE POLICY "Users can create matches involving themselves."
  ON public.matches FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = user_one_id OR auth.uid() = user_two_id)
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Users can update their matches." ON public.matches;
CREATE POLICY "Users can update their matches."
  ON public.matches FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = user_one_id OR auth.uid() = user_two_id)
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  )
  WITH CHECK (
    (auth.uid() = user_one_id OR auth.uid() = user_two_id)
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Users can delete their matches." ON public.matches;
CREATE POLICY "Users can delete their matches."
  ON public.matches FOR DELETE
  TO authenticated
  USING (
    (auth.uid() = user_one_id OR auth.uid() = user_two_id)
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

-- RLS: Messages
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.prevent_unsafe_message_updates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := current_setting('request.jwt.claim.role', true);

  IF jwt_role = 'authenticated' THEN
    IF new.match_id IS DISTINCT FROM old.match_id
      OR new.sender_id IS DISTINCT FROM old.sender_id
      OR new.created_at IS DISTINCT FROM old.created_at THEN
      RAISE EXCEPTION 'Not allowed to modify immutable message fields';
    END IF;

    IF auth.uid() IS DISTINCT FROM old.sender_id THEN
      IF new.content IS DISTINCT FROM old.content THEN
        RAISE EXCEPTION 'Not allowed to edit another user message';
      END IF;
      IF old.is_read = true AND new.is_read = false THEN
        RAISE EXCEPTION 'Not allowed to mark message as unread';
      END IF;
    END IF;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS prevent_unsafe_message_updates ON public.messages;
CREATE TRIGGER prevent_unsafe_message_updates
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.prevent_unsafe_message_updates();

DROP POLICY IF EXISTS "Users can read messages in their matches." ON public.messages;
CREATE POLICY "Users can read messages in their matches."
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
    and
    exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (auth.uid() = m.user_one_id or auth.uid() = m.user_two_id)
    )
  );

DROP POLICY IF EXISTS "Users can send messages in their matches." ON public.messages;
CREATE POLICY "Users can send messages in their matches."
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
    and
    auth.uid() = sender_id
    and exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (auth.uid() = m.user_one_id or auth.uid() = m.user_two_id)
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_premium = true
    )
  );

DROP POLICY IF EXISTS "Users can update their messages." ON public.messages;
CREATE POLICY "Users can update their messages."
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
    and exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (auth.uid() = m.user_one_id or auth.uid() = m.user_two_id)
    )
  )
  WITH CHECK (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
    and exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (auth.uid() = m.user_one_id or auth.uid() = m.user_two_id)
    )
    and (
      auth.uid() = sender_id
      or is_read = true
    )
  );

DROP POLICY IF EXISTS "Users can delete their messages." ON public.messages;
CREATE POLICY "Users can delete their messages."
  ON public.messages FOR DELETE
  TO authenticated
  USING (
    auth.uid() = sender_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

-- RLS: Events (analytics + errors)
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own events." ON public.events;
CREATE POLICY "Users can insert their own events."
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

-- RLS: Subscriptions
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their subscriptions." ON public.subscriptions;
CREATE POLICY "Users can view their subscriptions."
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );
