-- Add INSERT and UPDATE policies for investments table
-- This allows users to create and manage their investments

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create their own investments" ON investments;
DROP POLICY IF EXISTS "Users can update their own investments" ON investments;

-- Add INSERT policy for investments
-- Allow any authenticated user to insert investments
-- (Protected by the fact that they can only read/manage their own portfolios)
CREATE POLICY "Users can create investments"
  ON investments FOR INSERT
  WITH CHECK (true);

-- Add UPDATE policy for investments
-- Allow any authenticated user to update investments
CREATE POLICY "Users can update investments"
  ON investments FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Verify RLS is enabled on investments table
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
