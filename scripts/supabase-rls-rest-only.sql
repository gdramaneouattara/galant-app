-- RLS: Profiles
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by all authenticated users." ON public.profiles;
CREATE POLICY "Profiles are viewable by all authenticated users."
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete their own profile." ON public.profiles;
CREATE POLICY "Users can delete their own profile."
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- RLS: Matches
ALTER TABLE IF EXISTS public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their matches." ON public.matches;
CREATE POLICY "Users can view their matches."
  ON public.matches FOR SELECT
  TO authenticated
  USING (auth.uid() = user_one_id OR auth.uid() = user_two_id);

DROP POLICY IF EXISTS "Users can create matches involving themselves." ON public.matches;
CREATE POLICY "Users can create matches involving themselves."
  ON public.matches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_one_id OR auth.uid() = user_two_id);

DROP POLICY IF EXISTS "Users can update their matches." ON public.matches;
CREATE POLICY "Users can update their matches."
  ON public.matches FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_one_id OR auth.uid() = user_two_id)
  WITH CHECK (auth.uid() = user_one_id OR auth.uid() = user_two_id);

DROP POLICY IF EXISTS "Users can delete their matches." ON public.matches;
CREATE POLICY "Users can delete their matches."
  ON public.matches FOR DELETE
  TO authenticated
  USING (auth.uid() = user_one_id OR auth.uid() = user_two_id);

-- RLS: Messages
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read messages in their matches." ON public.messages;
CREATE POLICY "Users can read messages in their matches."
  ON public.messages FOR SELECT
  TO authenticated
  USING (
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
    auth.uid() = sender_id
    or exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (auth.uid() = m.user_one_id or auth.uid() = m.user_two_id)
    )
  )
  WITH CHECK (
    auth.uid() = sender_id
    or exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (auth.uid() = m.user_one_id or auth.uid() = m.user_two_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete their messages." ON public.messages;
CREATE POLICY "Users can delete their messages."
  ON public.messages FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

-- RLS: Events (analytics + errors)
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own events." ON public.events;
CREATE POLICY "Users can insert their own events."
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- RLS: Subscriptions
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their subscriptions." ON public.subscriptions;
CREATE POLICY "Users can view their subscriptions."
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
