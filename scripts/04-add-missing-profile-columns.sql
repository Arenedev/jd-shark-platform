-- Add missing columns to profiles table for business logic
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS base_structure TEXT CHECK (base_structure IN ('investor', 'organization', 'associate')),
ADD COLUMN IF NOT EXISTS current_rank TEXT DEFAULT 'unranked',
ADD COLUMN IF NOT EXISTS personal_capital NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS network_capital NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS grand_network_capital NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index for faster admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = TRUE;

-- Add payment proof column to deposit_requests if it doesn't exist
ALTER TABLE deposit_requests
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- Add payment proof column to withdrawal_requests
ALTER TABLE withdrawal_requests  
ADD COLUMN IF NOT EXISTS proof_of_payment_url TEXT;

COMMENT ON COLUMN profiles.base_structure IS 'Account type: investor, organization, or associate';
COMMENT ON COLUMN profiles.current_rank IS 'Current MLM rank based on PC/NC thresholds';
COMMENT ON COLUMN profiles.personal_capital IS 'Sum of user own investments';
COMMENT ON COLUMN profiles.network_capital IS 'Sum of direct downline investments';
COMMENT ON COLUMN profiles.grand_network_capital IS 'Sum of entire network investments';
COMMENT ON COLUMN profiles.is_admin IS 'Flag for admin access to admin dashboard';
