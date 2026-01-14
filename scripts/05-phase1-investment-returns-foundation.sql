-- ================================================
-- PHASE 1: INVESTMENT & RETURNS FOUNDATION
-- ================================================

-- Update investments table to match Phase 1 requirements
ALTER TABLE investments DROP CONSTRAINT IF EXISTS investments_portfolio_id_fkey;
ALTER TABLE investments ADD CONSTRAINT investments_portfolio_id_fkey 
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE SET NULL;

-- Add new columns for Phase 1
ALTER TABLE investments ADD COLUMN IF NOT EXISTS deposit_request_id UUID REFERENCES deposit_requests(id);
ALTER TABLE investments ADD COLUMN IF NOT EXISTS principal DECIMAL(18, 2);
ALTER TABLE investments ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS returns_start_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS lock_type TEXT DEFAULT 'none' CHECK (lock_type IN ('none', '1_year', '10_year'));
ALTER TABLE investments ADD COLUMN IF NOT EXISTS base_roi DECIMAL(5, 2) DEFAULT 1.0;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS lcr_bonus DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS effective_roi DECIMAL(5, 2);
ALTER TABLE investments ADD COLUMN IF NOT EXISTS total_returns DECIMAL(18, 2) DEFAULT 0;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS last_return_date DATE;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS next_return_date DATE;

-- Update deposit_requests table
ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS creates_investment BOOLEAN DEFAULT TRUE;

-- Create monthly_returns table to track each month's return calculation
CREATE TABLE IF NOT EXISTS monthly_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  return_period_month INTEGER NOT NULL,
  return_period_year INTEGER NOT NULL,
  principal_amount DECIMAL(18, 2) NOT NULL,
  roi_rate DECIMAL(5, 2) NOT NULL,
  return_amount DECIMAL(18, 2) NOT NULL,
  credited_to_wallet BOOLEAN DEFAULT FALSE,
  credited_at TIMESTAMP WITH TIME ZONE,
  calculation_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE monthly_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own returns"
  ON monthly_returns FOR SELECT
  USING (auth.uid() = user_id);

-- Create system_config table for base ROI configuration
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default base ROI (1% monthly)
INSERT INTO system_config (config_key, config_value, description) VALUES
('base_monthly_roi', '1.0', 'Base monthly ROI percentage for all investments'),
('lcr_1_year_bonus', '5.0', 'Additional ROI bonus for 1-year LCR lock'),
('lcr_10_year_bonus', '10.0', 'Additional ROI bonus for 10-year LCR lock'),
('returns_delay_months', '4', 'Number of months before returns start accruing')
ON CONFLICT (config_key) DO NOTHING;

-- Enable RLS
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read system config"
  ON system_config FOR SELECT
  TO authenticated
  USING (true);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_investments_deposit_request ON investments(deposit_request_id);
CREATE INDEX IF NOT EXISTS idx_investments_returns_start ON investments(returns_start_at);
CREATE INDEX IF NOT EXISTS idx_monthly_returns_investment ON monthly_returns(investment_id);
CREATE INDEX IF NOT EXISTS idx_monthly_returns_period ON monthly_returns(return_period_year, return_period_month);

-- Add comment to explain the flow
COMMENT ON TABLE investments IS 'Investments are created only when deposit_requests are approved by admin. Returns start 4 months after approval date.';
