-- RLS: Storage objects (bucket photos)
ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can see all photos." ON storage.objects;
CREATE POLICY "Authenticated users can see all photos."
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'photos');

DROP POLICY IF EXISTS "Users can upload to their own folder." ON storage.objects;
CREATE POLICY "Users can upload to their own folder."
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own photos." ON storage.objects;
CREATE POLICY "Users can update their own photos."
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own photos." ON storage.objects;
CREATE POLICY "Users can delete their own photos."
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
