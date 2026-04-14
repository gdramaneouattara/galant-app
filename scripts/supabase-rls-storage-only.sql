-- RLS: Storage objects
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean not null default false;
ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY;

-- BUCKET: photos
DROP POLICY IF EXISTS "Authenticated users can see all photos." ON storage.objects;
CREATE POLICY "Authenticated users can see all photos."
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'photos'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Users can upload to their own folder." ON storage.objects;
CREATE POLICY "Users can upload to their own folder."
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'photos' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Users can update their own photos." ON storage.objects;
CREATE POLICY "Users can update their own photos."
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'photos' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Users can delete their own photos." ON storage.objects;
CREATE POLICY "Users can delete their own photos."
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'photos' AND
    auth.uid()::text = (storage.foldername(name))[1] AND
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

-- BUCKET: kyc-docs
DROP POLICY IF EXISTS "Users can view their own KYC files." ON storage.objects;
CREATE POLICY "Users can view their own KYC files."
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-docs'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.is_admin = true
      )
    )
  );

DROP POLICY IF EXISTS "Users can upload to their own KYC folder." ON storage.objects;
CREATE POLICY "Users can upload to their own KYC folder."
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-docs'
    and auth.uid()::text = (storage.foldername(name))[1]
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

-- BUCKET: chat-media
-- Format attendu : match_id/user_id/filename
DROP POLICY IF EXISTS "Authenticated users can read chat media." ON storage.objects;
CREATE POLICY "Authenticated users can read chat media."
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-media'
    and (
      -- Soit participant du match actif
      exists (
        select 1 from public.matches m
        where m.id::text = (storage.foldername(name))[1]
          and m.status = 'ACTIVE'
          and (auth.uid() = m.user_one_id or auth.uid() = m.user_two_id)
      )
      -- Soit admin (pour modération)
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.is_admin = true
      )
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Users can upload chat media to their own folder." ON storage.objects;
CREATE POLICY "Users can upload chat media to their own folder."
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    and auth.uid()::text = (storage.foldername(name))[2]
    and exists (
      select 1 from public.matches m
      where m.id::text = (storage.foldername(name))[1]
        and m.status = 'ACTIVE'
        and (auth.uid() = m.user_one_id or auth.uid() = m.user_two_id)
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Users can delete their own chat media." ON storage.objects;
CREATE POLICY "Users can delete their own chat media."
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-media'
    and auth.uid()::text = (storage.foldername(name))[2]
    and exists (
      select 1 from public.matches m
      where m.id::text = (storage.foldername(name))[1]
        and (auth.uid() = m.user_one_id or auth.uid() = m.user_two_id)
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

-- BUCKET: community-media
-- Format: community_id/filename
DROP POLICY IF EXISTS "Members can view community media." ON storage.objects;
CREATE POLICY "Members can view community media."
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'community-media'
    and exists (
      select 1 from public.community_members cm
      where cm.community_id::text = (storage.foldername(name))[1]
        and cm.user_id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.suspended_at is null
    )
  );

DROP POLICY IF EXISTS "Users can upload community media." ON storage.objects;
CREATE POLICY "Users can upload community media."
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'community-media'
    and exists (
      select 1 from public.community_members cm
      where cm.community_id::text = (storage.foldername(name))[1]
        and cm.user_id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_premium = true and p.suspended_at is null
    )
  );
