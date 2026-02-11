-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles table (extends Supabase auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  base_structure TEXT DEFAULT 'user' CHECK (base_structure IN ('user', 'associate', 'senior_associate')),
  current_rank TEXT DEFAULT 'bronze',
  rank TEXT DEFAULT 'bronze',
  is_admin BOOLEAN DEFAULT FALSE,
  phone_number TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  date_of_birth DATE,
  profile_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  balance DECIMAL(18, 2) DEFAULT 0.00,
  total_funded DECIMAL(18, 2) DEFAULT 0.00,
  total_withdrawn DECIMAL(18, 2) DEFAULT 0.00,
  currency TEXT DEFAULT 'NGN',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallet Transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'deposit', 'withdrawal')),
  amount DECIMAL(18, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  reference TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  portfolio_type TEXT NOT NULL,
  purpose TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Investments table
CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(18, 2) NOT NULL,
  lock_type TEXT DEFAULT 'none' CHECK (lock_type IN ('none', '90days', '180days', '1year')),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  auto_reinvest BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'matured', 'withdrawn')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly Returns table
CREATE TABLE IF NOT EXISTS monthly_returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  return_percentage DECIMAL(5, 2),
  return_amount DECIMAL(18, 2),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LCR Investments table
CREATE TABLE IF NOT EXISTS lcr_investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(18, 2) NOT NULL,
  lock_period_days INTEGER NOT NULL DEFAULT 90,
  bonus_interest_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  maturity_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'matured', 'withdrawn')),
  final_amount DECIMAL(18, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 1,
  referral_code TEXT UNIQUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  commission_rate DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

-- Ranks table
CREATE TABLE IF NOT EXISTS ranks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rank_name TEXT UNIQUE NOT NULL,
  rank_order INTEGER UNIQUE NOT NULL,
  min_downline INTEGER DEFAULT 0,
  min_turnover DECIMAL(18, 2) DEFAULT 0,
  commission_rate DECIMAL(5, 2) DEFAULT 0,
  bonus_rate DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rank History table
CREATE TABLE IF NOT EXISTS rank_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  old_rank TEXT,
  new_rank TEXT NOT NULL,
  achievement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rank Configurations table
CREATE TABLE IF NOT EXISTS rank_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rank_id UUID NOT NULL REFERENCES ranks(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(rank_id, config_key)
);

-- Network Genealogy table
CREATE TABLE IF NOT EXISTS network_genealogy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MLM Earnings table
CREATE TABLE IF NOT EXISTS mlm_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referrer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('direct_commission', 'bonus', 'rank_bonus', 'lcr_bonus')),
  amount DECIMAL(18, 2) NOT NULL,
  source_reference TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Commissions table
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(18, 2) NOT NULL,
  commission_type TEXT NOT NULL,
  period TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly Commission Runs table
CREATE TABLE IF NOT EXISTS monthly_commission_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month DATE NOT NULL UNIQUE,
  total_commission DECIMAL(18, 2),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deposit Requests table
CREATE TABLE IF NOT EXISTS deposit_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(18, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  reference TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Withdrawal Requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(18, 2) NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'failed', 'cancelled')),
  reference TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization Loans table
CREATE TABLE IF NOT EXISTS organization_loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(18, 2) NOT NULL,
  interest_rate DECIMAL(5, 2) DEFAULT 0,
  duration_months INTEGER DEFAULT 12,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'defaulted')),
  disbursed_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loan Repayment Requests table
CREATE TABLE IF NOT EXISTS loan_repayment_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID NOT NULL REFERENCES organization_loans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(18, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Welcome Bonuses table
CREATE TABLE IF NOT EXISTS welcome_bonuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(18, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Incentives table
CREATE TABLE IF NOT EXISTS incentives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  incentive_type TEXT NOT NULL,
  amount DECIMAL(18, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Configuration table
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_base_structure ON profiles(base_structure);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_portfolios_owner_id ON portfolios(owner_id);
CREATE INDEX idx_portfolios_current_owner_id ON portfolios(current_owner_id);
CREATE INDEX idx_investments_portfolio_id ON investments(portfolio_id);
CREATE INDEX idx_investments_user_id ON investments(user_id);
CREATE INDEX idx_lcr_investments_user_id ON lcr_investments(user_id);
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX idx_rank_history_user_id ON rank_history(user_id);
CREATE INDEX idx_mlm_earnings_user_id ON mlm_earnings(user_id);
CREATE INDEX idx_commissions_user_id ON commissions(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_deposit_requests_user_id ON deposit_requests(user_id);
CREATE INDEX idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX idx_organization_loans_user_id ON organization_loans(user_id);
CREATE INDEX idx_loan_repayment_requests_user_id ON loan_repayment_requests(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lcr_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE mlm_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_repayment_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

-- RLS Policies for Wallets
CREATE POLICY "Users can view their own wallet" ON wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet" ON wallets
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for Wallet Transactions
CREATE POLICY "Users can view their own transactions" ON wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for Portfolios
CREATE POLICY "Users can view their portfolios" ON portfolios
  FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = current_owner_id);

CREATE POLICY "Users can create portfolios" ON portfolios
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- RLS Policies for Investments
CREATE POLICY "Users can view their investments" ON investments
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for LCR Investments
CREATE POLICY "Users can view their LCR investments" ON lcr_investments
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for Referrals
CREATE POLICY "Users can view their referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- RLS Policies for Notifications
CREATE POLICY "Users can view their notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Insert default ranks
INSERT INTO ranks (rank_name, rank_order, min_downline, min_turnover, commission_rate, bonus_rate) VALUES
  ('Bronze', 1, 0, 0, 5.00, 0.00),
  ('Silver', 2, 3, 50000.00, 7.00, 1.00),
  ('Gold', 3, 10, 200000.00, 10.00, 2.00),
  ('Platinum', 4, 30, 1000000.00, 12.00, 3.00),
  ('Diamond', 5, 100, 5000000.00, 15.00, 5.00)
ON CONFLICT (rank_name) DO NOTHING;

-- Insert default system config
INSERT INTO system_config (config_key, config_value, description) VALUES
  ('platform_name', 'JD Shark Platform', 'Main platform name'),
  ('currency', 'NGN', 'Default currency'),
  ('base_commission_rate', '5', 'Base commission rate for new associates'),
  ('welcome_bonus', '5000', 'Welcome bonus for new associates')
ON CONFLICT (config_key) DO NOTHING;
