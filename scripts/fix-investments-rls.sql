-- Fix RLS policy for investments to handle null user_id and portfolio-based access
-- This allows investments to be accessed through the portfolio relationship

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "investments_read" ON investments;
DROP POLICY IF EXISTS "investments_create" ON investments;
DROP POLICY IF EXISTS "investments_update" ON investments;
DROP POLICY IF EXISTS "investments_delete" ON investments;

-- Allow users to read investments through their portfolios
CREATE POLICY "investments_read"
ON investments FOR SELECT
USING (
  -- Allow if user owns the portfolio
  portfolio_id IN (
    SELECT id FROM portfolios 
    WHERE current_owner_id = auth.uid()
  )
  -- OR allow if user_id matches (for backward compatibility)
  OR user_id = auth.uid()
);

-- Allow users to create investments in their portfolios
CREATE POLICY "investments_create"
ON investments FOR INSERT
WITH CHECK (
  portfolio_id IN (
    SELECT id FROM portfolios 
    WHERE current_owner_id = auth.uid()
  )
);

-- Allow users to update investments in their portfolios
CREATE POLICY "investments_update"
ON investments FOR UPDATE
USING (
  portfolio_id IN (
    SELECT id FROM portfolios 
    WHERE current_owner_id = auth.uid()
  )
)
WITH CHECK (
  portfolio_id IN (
    SELECT id FROM portfolios 
    WHERE current_owner_id = auth.uid()
  )
);

-- Allow users to delete investments in their portfolios
CREATE POLICY "investments_delete"
ON investments FOR DELETE
USING (
  portfolio_id IN (
    SELECT id FROM portfolios 
    WHERE current_owner_id = auth.uid()
  )
);
