-- ============================================
-- JD SHARK PLATFORM - CONSOLIDATED DATABASE SETUP
-- This script combines all phases 1-5 for easy deployment
-- ============================================

-- Add is_admin column to profiles table first, before any policies reference it
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS base_structure TEXT CHECK (base_structure IN ('investor', 'organization', 'associate')),
ADD COLUMN IF NOT EXISTS current_rank TEXT,
ADD COLUMN IF NOT EXISTS personal_capital DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS network_capital DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS returns_balance DECIMAL(15,2) DEFAULT 0;

-- PHASE 1: Investment & Returns Foundation
-- ============================================

-- System configuration table
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default base ROI
INSERT INTO public.system_config (config_key, config_value, description)
VALUES ('base_roi_percentage', '10', 'Base monthly ROI percentage for investments')
ON CONFLICT (config_key) DO NOTHING;

-- Update investments table for Phase 1
-- Add user_id column to investments table for direct user reference
ALTER TABLE public.investments
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS principal DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS returns_start_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lock_type TEXT DEFAULT 'none' CHECK (lock_type IN ('none', '1_year', '10_year')),
ADD COLUMN IF NOT EXISTS base_roi DECIMAL(5,2) DEFAULT 10.0,
ADD COLUMN IF NOT EXISTS lcr_bonus DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS effective_roi DECIMAL(5,2) DEFAULT 10.0,
ADD COLUMN IF NOT EXISTS total_returns DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_return_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_return_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS maturity_date TIMESTAMPTZ;

-- Update existing investments to set user_id from portfolio owner
UPDATE public.investments i
SET user_id = p.owner_id
FROM public.portfolios p
WHERE i.portfolio_id = p.id
AND i.user_id IS NULL;

-- Monthly returns tracking
CREATE TABLE IF NOT EXISTS public.monthly_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id UUID REFERENCES public.investments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  return_period_month INTEGER NOT NULL,
  return_period_year INTEGER NOT NULL,
  principal_amount DECIMAL(15,2) NOT NULL,
  roi_rate DECIMAL(5,2) NOT NULL,
  return_amount DECIMAL(15,2) NOT NULL,
  credited_to_wallet BOOLEAN DEFAULT FALSE,
  credited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(investment_id, return_period_month, return_period_year)
);

-- Create deposit_requests table
CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL,
  payment_proof_url TEXT,
  lock_type TEXT DEFAULT 'none' CHECK (lock_type IN ('none', '1_year', '10_year')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  transaction_reference TEXT UNIQUE,
  admin_notes TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PHASE 2: Personal Capital & Withdrawals
-- ============================================

-- Update wallets for PC tracking
ALTER TABLE public.wallets
ADD COLUMN IF NOT EXISTS personal_capital DECIMAL(15,2) DEFAULT 0;

-- Fixed user_balances view to use correct column names
CREATE OR REPLACE VIEW public.user_balances AS
SELECT 
  p.id as user_id,
  p.full_name,
  p.email,
  COALESCE(SUM(i.principal), 0) as personal_capital,
  COALESCE(p.returns_balance, 0) as returns_balance,
  COALESCE(SUM(mr.return_amount), 0) as total_returns_earned,
  COALESCE(SUM(CASE WHEN wr.status = 'pending' THEN wr.amount ELSE 0 END), 0) as pending_withdrawals,
  COALESCE(p.returns_balance, 0) - COALESCE(SUM(CASE WHEN wr.status = 'pending' THEN wr.amount ELSE 0 END), 0) as available_for_withdrawal
FROM public.profiles p
LEFT JOIN public.investments i ON p.id = i.user_id AND i.status = 'active'
LEFT JOIN public.monthly_returns mr ON p.id = mr.user_id
LEFT JOIN public.withdrawal_requests wr ON p.id = wr.user_id AND wr.status = 'pending'
GROUP BY p.id, p.full_name, p.email, p.returns_balance;

-- PHASE 3: Rank System & Network Structure
-- ============================================

-- Ranks configuration table
CREATE TABLE IF NOT EXISTS public.ranks (
  id SERIAL PRIMARY KEY,
  rank_name TEXT UNIQUE NOT NULL,
  rank_order INTEGER UNIQUE NOT NULL,
  base_structure TEXT CHECK (base_structure IN ('investor', 'organization', 'associate')),
  min_personal_capital DECIMAL(15,2) NOT NULL DEFAULT 0,
  min_network_capital DECIMAL(15,2) NOT NULL DEFAULT 0,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  min_guaranteed_commission DECIMAL(15,2) DEFAULT 0,
  welcome_bonus_percentage DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert all ranks from business document
INSERT INTO public.ranks (rank_name, rank_order, base_structure, min_personal_capital, min_network_capital, commission_rate, min_guaranteed_commission, welcome_bonus_percentage) VALUES
-- Investor ranks
('Fin Starter', 1, 'investor', 0, 0, 0, 0, 0),
('Core Investor', 2, 'investor', 500000, 0, 5, 10000, 2),
('Prime Investor', 3, 'investor', 1000000, 0, 7, 20000, 3),
('Elite Investor', 4, 'investor', 2000000, 0, 10, 50000, 4),
('Alpha 1', 5, 'investor', 5000000, 10000000, 12, 100000, 5),
('Alpha 2', 6, 'investor', 10000000, 30000000, 15, 300000, 6),
('Alpha 3', 7, 'investor', 20000000, 60000000, 18, 600000, 7),
('Star 1', 8, 'investor', 50000000, 150000000, 20, 1500000, 8),
('Star 2', 9, 'investor', 100000000, 300000000, 22, 3000000, 10),
('Star 3', 10, 'investor', 200000000, 600000000, 25, 6000000, 12),

-- Organization ranks
('Organization Starter', 11, 'organization', 0, 0, 0, 0, 0),
('Organization Core', 12, 'organization', 1000000, 0, 5, 20000, 2),
('Organization Prime', 13, 'organization', 2000000, 0, 7, 40000, 3),
('Organization Elite', 14, 'organization', 5000000, 0, 10, 100000, 4),
('Organization Alpha 1', 15, 'organization', 10000000, 20000000, 12, 200000, 5),
('Organization Alpha 2', 16, 'organization', 20000000, 60000000, 15, 600000, 6),
('Organization Alpha 3', 17, 'organization', 40000000, 120000000, 18, 1200000, 7),
('Organization Star 1', 18, 'organization', 100000000, 300000000, 20, 3000000, 8),
('Organization Star 2', 19, 'organization', 200000000, 600000000, 22, 6000000, 10),
('Organization Star 3', 20, 'organization', 400000000, 1200000000, 25, 12000000, 12),

-- Associate ranks (same as Investor but requires referral)
('Associate Starter', 21, 'associate', 0, 0, 0, 0, 0),
('Associate Core', 22, 'associate', 500000, 0, 5, 10000, 2),
('Associate Prime', 23, 'associate', 1000000, 0, 7, 20000, 3),
('Associate Elite', 24, 'associate', 2000000, 0, 10, 50000, 4),
('Associate Alpha 1', 25, 'associate', 5000000, 10000000, 12, 100000, 5),
('Associate Alpha 2', 26, 'associate', 10000000, 30000000, 15, 300000, 6),
('Associate Alpha 3', 27, 'associate', 20000000, 60000000, 18, 600000, 7),
('Associate Star 1', 28, 'associate', 50000000, 150000000, 20, 1500000, 8),
('Associate Star 2', 29, 'associate', 100000000, 300000000, 22, 3000000, 10),
('Associate Star 3', 30, 'associate', 200000000, 600000000, 25, 6000000, 12)
ON CONFLICT (rank_name) DO NOTHING;

-- Network genealogy table
CREATE TABLE IF NOT EXISTS public.network_genealogy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  upline_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  generation INTEGER NOT NULL CHECK (generation > 0 AND generation <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, upline_id, generation)
);

-- Rank history
CREATE TABLE IF NOT EXISTS public.rank_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_rank TEXT,
  new_rank TEXT NOT NULL,
  personal_capital DECIMAL(15,2),
  network_capital DECIMAL(15,2),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- PHASE 4: Network Commissions
-- ============================================

-- Commissions tracking table
CREATE TABLE IF NOT EXISTS public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  downline_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  commission_type TEXT CHECK (commission_type IN ('network', 'organization_referral', 'guaranteed')),
  generation INTEGER,
  downline_return_amount DECIMAL(15,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(15,2) NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'credited')),
  credited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly commission runs
CREATE TABLE IF NOT EXISTS public.commission_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_commissions DECIMAL(15,2) NOT NULL,
  total_users_paid INTEGER NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed')),
  run_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, year)
);

-- PHASE 5: Special Features
-- ============================================

-- Organization loans table
CREATE TABLE IF NOT EXISTS public.organization_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  principal_amount DECIMAL(15,2) NOT NULL,
  interest_rate DECIMAL(5,2) DEFAULT 0.5,
  loan_date TIMESTAMPTZ DEFAULT NOW(),
  maturity_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'repaid', 'defaulted')),
  monthly_interest DECIMAL(15,2) NOT NULL,
  total_due DECIMAL(15,2) NOT NULL,
  repaid_amount DECIMAL(15,2) DEFAULT 0,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Welcome bonuses tracking
CREATE TABLE IF NOT EXISTS public.welcome_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rank_name TEXT NOT NULL,
  bonus_percentage DECIMAL(5,2) NOT NULL,
  bonus_amount DECIMAL(15,2) NOT NULL,
  credited_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incentives tracking (cars, vacations, etc)
CREATE TABLE IF NOT EXISTS public.incentives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  incentive_type TEXT NOT NULL,
  incentive_description TEXT NOT NULL,
  rank_name TEXT NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for new tables
-- ============================================

ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_genealogy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.welcome_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incentives ENABLE ROW LEVEL SECURITY;

-- Deposit requests policies
CREATE POLICY "Users can view own deposit requests" ON public.deposit_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert deposit requests" ON public.deposit_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all deposit requests" ON public.deposit_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Monthly returns policies
CREATE POLICY "Users can view own returns" ON public.monthly_returns FOR SELECT USING (auth.uid() = user_id);

-- Ranks policies (public read)
CREATE POLICY "Anyone can view ranks" ON public.ranks FOR SELECT USING (true);

-- Network genealogy policies
CREATE POLICY "Users can view own network" ON public.network_genealogy FOR SELECT USING (
  auth.uid() = user_id OR auth.uid() = upline_id
);

-- Commissions policies
CREATE POLICY "Users can view own commissions" ON public.commissions FOR SELECT USING (auth.uid() = user_id);

-- Loans policies
CREATE POLICY "Users can view own loans" ON public.organization_loans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Organizations can request loans" ON public.organization_loans FOR INSERT WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND base_structure = 'organization')
);

-- Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_id ON public.deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON public.deposit_requests(status);
CREATE INDEX IF NOT EXISTS idx_monthly_returns_investment_id ON public.monthly_returns(investment_id);
CREATE INDEX IF NOT EXISTS idx_monthly_returns_user_id ON public.monthly_returns(user_id);
CREATE INDEX IF NOT EXISTS idx_network_genealogy_user_id ON public.network_genealogy(user_id);
CREATE INDEX IF NOT EXISTS idx_network_genealogy_upline_id ON public.network_genealogy(upline_id);
CREATE INDEX IF NOT EXISTS idx_commissions_user_id ON public.commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON public.commissions(status);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON public.investments(status);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'JD SHARK Platform database setup completed successfully!';
  RAISE NOTICE 'All tables, policies, and indexes have been created.';
  RAISE NOTICE 'Base ROI set to 10%% monthly.';
  RAISE NOTICE 'All 30 ranks configured (10 each for Investor, Organization, Associate).';
END $$;
