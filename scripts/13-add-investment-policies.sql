-- Add INSERT and UPDATE policies for investments table
-- This allows users to create and manage their investments

-- Add INSERT policy for investments
CREATE POLICY "Users can create their own investments"
  ON investments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy for investments (for admin updates)
CREATE POLICY "Users can update their own investments"
  ON investments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Verify RLS is enabled on investments table
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
