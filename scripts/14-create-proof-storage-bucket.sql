-- Create storage bucket for proof of deposits
INSERT INTO storage.buckets (id, name, public)
VALUES ('proof-of-deposits', 'proof-of-deposits', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for proof-of-deposits bucket
CREATE POLICY "Users can upload their own deposits proof" ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'proof-of-deposits' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view all deposits proofs" ON storage.objects
FOR SELECT
USING (bucket_id = 'proof-of-deposits');

-- Allow public access to proofs (read-only)
CREATE POLICY "Public can view proof images" ON storage.objects
FOR SELECT
USING (bucket_id = 'proof-of-deposits');
