-- Add INSERT and UPDATE policies for investments table
-- This allows users to create and manage their investments

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create their own investments" ON investments;
DROP POLICY IF EXISTS "Users can update their own investments" ON investments;

-- Add INSERT policy for investments
-- Users can create investments in portfolios they own or are the current owner of
CREATE POLICY "Users can create their own investments"
  ON investments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = investments.portfolio_id 
      AND (portfolios.owner_id = auth.uid() OR portfolios.current_owner_id = auth.uid())
    )
  );

-- Add UPDATE policy for investments
-- Users can update investments in portfolios they own or are the current owner of
CREATE POLICY "Users can update their own investments"
  ON investments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = investments.portfolio_id 
      AND (portfolios.owner_id = auth.uid() OR portfolios.current_owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = investments.portfolio_id 
      AND (portfolios.owner_id = auth.uid() OR portfolios.current_owner_id = auth.uid())
    )
  );

-- Verify RLS is enabled on investments table
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
