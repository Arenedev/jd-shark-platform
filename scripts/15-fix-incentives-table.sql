-- Fix incentives table to have all required columns

-- Add rank_id column if it doesn't exist (without foreign key for now)
ALTER TABLE incentives ADD COLUMN IF NOT EXISTS rank_id UUID;

-- Add title column if it doesn't exist
ALTER TABLE incentives ADD COLUMN IF NOT EXISTS title TEXT;

-- Add description column if it doesn't exist  
ALTER TABLE incentives ADD COLUMN IF NOT EXISTS description TEXT;

-- Copy data from incentive_description to description if needed
UPDATE incentives SET description = incentive_description 
WHERE description IS NULL AND incentive_description IS NOT NULL;

-- Add value_amount column if it doesn't exist
ALTER TABLE incentives ADD COLUMN IF NOT EXISTS value_amount DECIMAL(18, 2);

-- Add status column if it doesn't exist
ALTER TABLE incentives ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Add claimed_at column if it doesn't exist
ALTER TABLE incentives ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE;

-- Add metadata column if it doesn't exist
ALTER TABLE incentives ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add created_at column if it doesn't exist
ALTER TABLE incentives ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update created_at from awarded_at if needed
UPDATE incentives SET created_at = awarded_at 
WHERE created_at IS NULL AND awarded_at IS NOT NULL;

-- Migrate rank_name to title if needed
UPDATE incentives SET title = rank_name 
WHERE title IS NULL AND rank_name IS NOT NULL;

-- Ensure RLS is enabled
ALTER TABLE incentives ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy for users to view their own incentives
DROP POLICY IF EXISTS "users_view_own_incentives" ON incentives;
CREATE POLICY "users_view_own_incentives" ON incentives
  FOR SELECT
  USING (auth.uid() = user_id);
