-- RLS: Profiles
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean not null default false;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS is_premium boolean not null default false;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS boosted_until timestamptz;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean not null default false;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS is_invisible boolean not null default false;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS photo_review_status text not null default 'APPROVED';
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS country text;
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
      OR new.suspended_at IS DISTINCT FROM old.suspended_at
      OR new.photo_review_status IS DISTINCT FROM old.photo_review_status THEN
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
    AND coalesce(array_length(photos, 1), 0) BETWEEN 3 AND 6
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
    AND coalesce(array_length(photos, 1), 0) BETWEEN 3 AND 6
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
      IF new.message_type IS DISTINCT FROM old.message_type
        OR new.media_url IS DISTINCT FROM old.media_url
        OR new.metadata IS DISTINCT FROM old.metadata THEN
        RAISE EXCEPTION 'Not allowed to edit another user media fields';
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
    and not exists (
      select 1
      from public.matches m
      join public.blocks b
        on m.id = messages.match_id
       and (
        (b.user_id = m.user_one_id and b.blocked_user_id = m.user_two_id)
        or (b.user_id = m.user_two_id and b.blocked_user_id = m.user_one_id)
       )
      where auth.uid() = m.user_one_id or auth.uid() = m.user_two_id
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
    and upper(coalesce(message_type, 'TEXT')) in ('TEXT', 'IMAGE')
    and (
      (upper(coalesce(message_type, 'TEXT')) = 'TEXT' and length(trim(coalesce(content, ''))) > 0)
      or (upper(coalesce(message_type, 'TEXT')) = 'IMAGE' and media_url is not null)
    )
    and not exists (
      select 1
      from public.matches m
      join public.blocks b
        on m.id = messages.match_id
       and (
        (b.user_id = m.user_one_id and b.blocked_user_id = m.user_two_id)
        or (b.user_id = m.user_two_id and b.blocked_user_id = m.user_one_id)
       )
      where auth.uid() = m.user_one_id or auth.uid() = m.user_two_id
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

-- RLS: Admin audit logs
ALTER TABLE IF EXISTS public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs." ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs."
  ON public.admin_audit_logs FOR SELECT
  TO authenticated
  USING (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Admins can insert audit logs." ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs."
  ON public.admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true and p.suspended_at is null
    )
  );

-- RLS: Photo review queue
ALTER TABLE IF EXISTS public.photo_review_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view photo reviews." ON public.photo_review_queue;
CREATE POLICY "Admins can view photo reviews."
  ON public.photo_review_queue FOR SELECT
  TO authenticated
  USING (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Admins can update photo reviews." ON public.photo_review_queue;
CREATE POLICY "Admins can update photo reviews."
  ON public.photo_review_queue FOR UPDATE
  TO authenticated
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

DROP POLICY IF EXISTS "Admins can insert photo reviews." ON public.photo_review_queue;
CREATE POLICY "Admins can insert photo reviews."
  ON public.photo_review_queue FOR INSERT
  TO authenticated
  WITH CHECK (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true and p.suspended_at is null
    )
  );

-- RLS: KYC verifications
ALTER TABLE IF EXISTS public.kyc_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own KYC requests." ON public.kyc_verifications;
CREATE POLICY "Users can view their own KYC requests."
  ON public.kyc_verifications FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Users can create their own KYC requests." ON public.kyc_verifications;
CREATE POLICY "Users can create their own KYC requests."
  ON public.kyc_verifications FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    and status = 'PENDING'
    and reviewed_at is null
    and reviewed_by is null
    and rejection_reason is null
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Admins can view all KYC requests." ON public.kyc_verifications;
CREATE POLICY "Admins can view all KYC requests."
  ON public.kyc_verifications FOR SELECT
  TO authenticated
  USING (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Admins can review KYC requests." ON public.kyc_verifications;
CREATE POLICY "Admins can review KYC requests."
  ON public.kyc_verifications FOR UPDATE
  TO authenticated
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
    and reviewed_by = auth.uid()
    and status in ('IN_REVIEW', 'APPROVED', 'REJECTED')
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

-- RLS: Likes
ALTER TABLE IF EXISTS public.likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view likes they sent." ON public.likes;
CREATE POLICY "Users can view likes they sent."
  ON public.likes FOR SELECT
  TO authenticated
  USING (
    liker_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Premium users can view likes they received." ON public.likes;
CREATE POLICY "Premium users can view likes they received."
  ON public.likes FOR SELECT
  TO authenticated
  USING (
    liked_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_premium = true and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Users can create likes." ON public.likes;
CREATE POLICY "Users can create likes."
  ON public.likes FOR INSERT
  TO authenticated
  WITH CHECK (
    liker_id = auth.uid()
    and liked_id <> auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
    and (
      is_super_like = false
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.is_premium = true and p.suspended_at is null
      )
    )
    and not exists (
      select 1 from public.blocks b
      where (b.user_id = liker_id and b.blocked_user_id = liked_id)
         or (b.user_id = liked_id and b.blocked_user_id = liker_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete likes they sent." ON public.likes;
CREATE POLICY "Users can delete likes they sent."
  ON public.likes FOR DELETE
  TO authenticated
  USING (
    liker_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

-- RLS: Blocks
ALTER TABLE IF EXISTS public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their blocks." ON public.blocks;
CREATE POLICY "Users can view their blocks."
  ON public.blocks FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Users can create their blocks." ON public.blocks;
CREATE POLICY "Users can create their blocks."
  ON public.blocks FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    and blocked_user_id <> auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Users can delete their blocks." ON public.blocks;
CREATE POLICY "Users can delete their blocks."
  ON public.blocks FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

-- RLS: Reports
ALTER TABLE IF EXISTS public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own reports." ON public.reports;
CREATE POLICY "Users can view their own reports."
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    reporter_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Users can create reports." ON public.reports;
CREATE POLICY "Users can create reports."
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Admins can view all reports." ON public.reports;
CREATE POLICY "Admins can view all reports."
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Admins can review reports." ON public.reports;
CREATE POLICY "Admins can review reports."
  ON public.reports FOR UPDATE
  TO authenticated
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

-- RLS: Push tokens
ALTER TABLE IF EXISTS public.push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their push tokens." ON public.push_tokens;
CREATE POLICY "Users can view their push tokens."
  ON public.push_tokens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their push tokens." ON public.push_tokens;
CREATE POLICY "Users can manage their push tokens."
  ON public.push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their push tokens." ON public.push_tokens;
CREATE POLICY "Users can update their push tokens."
  ON public.push_tokens FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their push tokens." ON public.push_tokens;
CREATE POLICY "Users can delete their push tokens."
  ON public.push_tokens FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS: Privacy requests
ALTER TABLE IF EXISTS public.privacy_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their privacy requests." ON public.privacy_requests;
CREATE POLICY "Users can view their privacy requests."
  ON public.privacy_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create privacy requests." ON public.privacy_requests;
CREATE POLICY "Users can create privacy requests."
  ON public.privacy_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all privacy requests." ON public.privacy_requests;
CREATE POLICY "Admins can view all privacy requests."
  ON public.privacy_requests FOR SELECT
  TO authenticated
  USING (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Admins can resolve privacy requests." ON public.privacy_requests;
CREATE POLICY "Admins can resolve privacy requests."
  ON public.privacy_requests FOR UPDATE
  TO authenticated
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
