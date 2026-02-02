-- Drop existing storage policies to start fresh
DROP POLICY IF EXISTS "Users can upload to their own KYC folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read all KYC documents" ON storage.objects;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload KYC documents to their own folder
CREATE POLICY "kyc_users_can_upload"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'kyc-documents' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = 'kyc' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Allow users to read their own KYC documents
CREATE POLICY "kyc_users_can_read_own"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'kyc-documents' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = 'kyc' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Allow admins to read all KYC documents (for verification)
CREATE POLICY "kyc_admins_can_read_all"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'kyc-documents' AND
    auth.role() = 'authenticated'
  );
