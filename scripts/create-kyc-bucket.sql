-- Create KYC documents storage bucket
INSERT INTO storage.buckets (id, name, owner, public)
VALUES ('kyc-documents', 'kyc-documents', auth.uid(), false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policy to allow users to upload their own KYC documents
CREATE POLICY "Users can upload their own KYC documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'kyc-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create RLS policy to allow users to read their own KYC documents
CREATE POLICY "Users can read their own KYC documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to read all KYC documents
CREATE POLICY "Admins can read all KYC documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'kyc-documents'
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);
