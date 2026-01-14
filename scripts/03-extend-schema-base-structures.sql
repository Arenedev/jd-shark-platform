-- ================================================
-- JD SHARK LTD - Extended Schema for Base Structures, Ranks, and Business Logic
-- ================================================

-- Step 1: Add base_structure column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS base_structure TEXT DEFAULT 'investor' 
  CHECK (base_structure IN ('investor', 'organization', 'associate'));

-- Step 2: Add rank column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rank TEXT DEFAULT 'fin_starter'
  CHECK (rank IN ('fin_starter', 'investor', 'capital_investor', 'core_investor', 'alpha_investor', 'grand_alpha', 'apex_alpha', 'grand_star_investor'));

-- Step 3: Add personal_capital and network_capital tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS personal_capital DECIMAL(18, 2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS network_capital DECIMAL(18, 2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grand_network_capital DECIMAL(18, 2) DEFAULT 0;

-- Step 4: Add referrer_id to profiles for direct referrer tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referrer_id UUID REFERENCES profiles(id);

-- Step 5: Add upgrade_requested flag for Investor -> Associate upgrades
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS upgrade_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS upgrade_approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS upgrade_approved_by UUID REFERENCES profiles(id);

-- ================================================
-- DEPOSIT REQUESTS TABLE (Admin-controlled deposits)
-- ================================================
CREATE TABLE IF NOT EXISTS deposit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount DECIMAL(18, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer', 'card', 'ussd', 'crypto')),
  payment_proof_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  transaction_reference TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- RANKS CONFIGURATION TABLE (Admin-configurable)
-- ================================================
CREATE TABLE IF NOT EXISTS rank_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rank_name TEXT UNIQUE NOT NULL,
  rank_order INTEGER NOT NULL,
  pc_requirement DECIMAL(18, 2) NOT NULL,
  nc_requirement DECIMAL(18, 2) NOT NULL,
  pc_earning_rate DECIMAL(5, 2) NOT NULL,
  network_earning_rate DECIMAL(5, 2) DEFAULT 0,
  grand_network_rate DECIMAL(5, 2) DEFAULT 0,
  vnc_rate DECIMAL(5, 2) DEFAULT 0,
  rank_bonus DECIMAL(18, 2) DEFAULT 0,
  perks TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default rank configurations
INSERT INTO rank_configurations (rank_name, rank_order, pc_requirement, nc_requirement, pc_earning_rate, network_earning_rate, grand_network_rate, vnc_rate, rank_bonus, perks) VALUES
('fin_starter', 1, 500000, 1000000, 5, 0, 0, 0, 0, ARRAY['Basic access']),
('investor', 2, 5000000, 10000000, 6, 0, 0, 0, 50000, ARRAY['Priority support']),
('capital_investor', 3, 25000000, 50000000, 6, 1, 0, 0, 200000, ARRAY['Priority support', 'Quarterly reports']),
('core_investor', 4, 50000000, 100000000, 7, 2, 0, 0, 500000, ARRAY['Priority support', 'Quarterly reports', '1% minimum guarantee']),
('alpha_investor', 5, 250000000, 500000000, 8, 4, 0, 0, 2000000, ARRAY['Car', 'Vacation', 'Recognition', 'VIP support']),
('grand_alpha', 6, 500000000, 1000000000, 8, 4, 0.6, 0, 5000000, ARRAY['Car', 'Vacation', 'Recognition', 'VIP support', 'Grand network earnings']),
('apex_alpha', 7, 750000000, 2000000000, 8, 4, 0, 0.4, 10000000, ARRAY['All perks', 'VNC earnings']),
('grand_star_investor', 8, 1000000000, 5000000000, 10, 5, 1, 0.5, 50000000, ARRAY['All perks', 'Custom benefits'])
ON CONFLICT (rank_name) DO NOTHING;

-- ================================================
-- LCR (LOCKED CAPITAL) INVESTMENTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS lcr_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
  deposit_request_id UUID REFERENCES deposit_requests(id),
  principal_amount DECIMAL(18, 2) NOT NULL CHECK (principal_amount > 0),
  lock_period_years INTEGER NOT NULL CHECK (lock_period_years IN (1, 10)),
  bonus_rate DECIMAL(5, 2) NOT NULL, -- 5% for 1 year, 10% for 10 years
  base_roi_rate DECIMAL(5, 2) NOT NULL, -- Based on user's rank at time of investment
  effective_roi_rate DECIMAL(5, 2) NOT NULL, -- base_roi + bonus
  start_date DATE NOT NULL,
  maturity_date DATE NOT NULL,
  unlock_date DATE NOT NULL, -- 4 months after start_date for earnings
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'earning', 'matured', 'withdrawn', 'reinvested')),
  auto_reinvest BOOLEAN DEFAULT FALSE,
  total_earned DECIMAL(18, 2) DEFAULT 0,
  last_earning_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- EARNINGS TABLE (Detailed earnings tracking)
-- ================================================
CREATE TABLE IF NOT EXISTS earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  earning_type TEXT NOT NULL CHECK (earning_type IN ('pc_interest', 'network_commission', 'grand_network_commission', 'vnc_commission', 'rank_bonus', 'org_commission')),
  source_user_id UUID REFERENCES profiles(id), -- The user whose investment generated this earning
  source_investment_id UUID REFERENCES lcr_investments(id),
  generation_level INTEGER, -- 1, 2, etc. for network earnings
  amount DECIMAL(18, 2) NOT NULL,
  rank_at_time TEXT, -- User's rank when earning was calculated
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'withdrawn')),
  credited_at TIMESTAMP WITH TIME ZONE,
  earning_period_start DATE,
  earning_period_end DATE,
  calculation_details JSONB, -- Store calculation breakdown for audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- ORGANIZATION LOANS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS organization_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  loan_amount DECIMAL(18, 2) NOT NULL CHECK (loan_amount > 0),
  portfolio_value DECIMAL(18, 2) NOT NULL, -- Portfolio value at time of loan
  loan_percentage DECIMAL(5, 2) NOT NULL CHECK (loan_percentage >= 50 AND loan_percentage <= 80),
  interest_rate DECIMAL(5, 2) DEFAULT 0.5, -- 0.5% monthly
  total_repayable DECIMAL(18, 2) NOT NULL,
  amount_repaid DECIMAL(18, 2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'repaid', 'defaulted', 'rejected')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  disbursed_at TIMESTAMP WITH TIME ZONE,
  due_date DATE,
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- LOAN REPAYMENTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS loan_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES organization_loans(id) ON DELETE CASCADE,
  amount DECIMAL(18, 2) NOT NULL,
  payment_method TEXT,
  payment_reference TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  confirmed_by UUID REFERENCES profiles(id),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- BENEFICIARIES TABLE (Transgenerational)
-- ================================================
CREATE TABLE IF NOT EXISTS beneficiaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  percentage_share DECIMAL(5, 2) NOT NULL CHECK (percentage_share > 0 AND percentage_share <= 100),
  id_document_url TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- RANK HISTORY TABLE (Audit trail)
-- ================================================
CREATE TABLE IF NOT EXISTS rank_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  previous_rank TEXT,
  new_rank TEXT NOT NULL,
  pc_at_change DECIMAL(18, 2),
  nc_at_change DECIMAL(18, 2),
  bonus_awarded DECIMAL(18, 2) DEFAULT 0,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- ADMIN AUDIT LOG TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id),
  action_type TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  target_user_id UUID REFERENCES profiles(id),
  old_values JSONB,
  new_values JSONB,
  notes TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- ROW LEVEL SECURITY POLICIES
-- ================================================

-- Enable RLS on new tables
ALTER TABLE deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rank_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lcr_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rank_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Deposit requests policies
CREATE POLICY "Users can view their own deposit requests"
  ON deposit_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deposit requests"
  ON deposit_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Rank configurations - read-only for all authenticated users
CREATE POLICY "Authenticated users can view rank configurations"
  ON rank_configurations FOR SELECT
  TO authenticated
  USING (true);

-- LCR investments policies
CREATE POLICY "Users can view their own LCR investments"
  ON lcr_investments FOR SELECT
  USING (auth.uid() = user_id);

-- Earnings policies
CREATE POLICY "Users can view their own earnings"
  ON earnings FOR SELECT
  USING (auth.uid() = user_id);

-- Organization loans policies
CREATE POLICY "Users can view their own loans"
  ON organization_loans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Organizations can create loan requests"
  ON organization_loans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Loan repayments policies
CREATE POLICY "Users can view their loan repayments"
  ON loan_repayments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_loans
      WHERE organization_loans.id = loan_repayments.loan_id
      AND organization_loans.user_id = auth.uid()
    )
  );

-- Beneficiaries policies
CREATE POLICY "Users can view their own beneficiaries"
  ON beneficiaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own beneficiaries"
  ON beneficiaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own beneficiaries"
  ON beneficiaries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own beneficiaries"
  ON beneficiaries FOR DELETE
  USING (auth.uid() = user_id);

-- Rank history policies
CREATE POLICY "Users can view their own rank history"
  ON rank_history FOR SELECT
  USING (auth.uid() = user_id);

-- Admin audit log - no public access
CREATE POLICY "No public access to audit log"
  ON admin_audit_log FOR SELECT
  USING (false);

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================
CREATE INDEX IF NOT EXISTS idx_profiles_base_structure ON profiles(base_structure);
CREATE INDEX IF NOT EXISTS idx_profiles_rank ON profiles(rank);
CREATE INDEX IF NOT EXISTS idx_profiles_referrer_id ON profiles(referrer_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_id ON deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON deposit_requests(status);
CREATE INDEX IF NOT EXISTS idx_lcr_investments_user_id ON lcr_investments(user_id);
CREATE INDEX IF NOT EXISTS idx_lcr_investments_status ON lcr_investments(status);
CREATE INDEX IF NOT EXISTS idx_earnings_user_id ON earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_type ON earnings(earning_type);
CREATE INDEX IF NOT EXISTS idx_organization_loans_user_id ON organization_loans(user_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_id ON beneficiaries(user_id);
CREATE INDEX IF NOT EXISTS idx_rank_history_user_id ON rank_history(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);

-- ================================================
-- Add earnings_balance to wallets (separate from withdrawable balance)
-- ================================================
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS earnings_balance DECIMAL(18, 2) DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS pending_deposits DECIMAL(18, 2) DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS locked_capital DECIMAL(18, 2) DEFAULT 0;
