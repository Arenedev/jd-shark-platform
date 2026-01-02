-- Create profiles table for user information
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  country TEXT,
  nin_or_bvn TEXT,
  profile_image_url TEXT,
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
  kyc_document_url TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wallet table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  balance DECIMAL(18, 2) DEFAULT 0,
  currency TEXT DEFAULT 'NGN',
  total_funded DECIMAL(18, 2) DEFAULT 0,
  total_withdrawn DECIMAL(18, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  portfolio_type TEXT NOT NULL CHECK (portfolio_type IN ('Personal', 'For Others', 'For Purpose')),
  purpose TEXT,
  total_balance DECIMAL(18, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  transferred_at TIMESTAMP WITH TIME ZONE
);

-- Create savings plans table
CREATE TABLE IF NOT EXISTS savings_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(18, 2) NOT NULL,
  frequency TEXT DEFAULT 'one-time' CHECK (frequency IN ('one-time', 'monthly', 'yearly')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  current_balance DECIMAL(18, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create investments table
CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  amount DECIMAL(18, 2) NOT NULL,
  start_date DATE NOT NULL,
  maturity_date DATE NOT NULL,
  roi_percentage DECIMAL(5, 2) DEFAULT 100,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'matured', 'reinvested')),
  auto_reinvest BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create MLM/Referral structure
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  level INTEGER CHECK (level >= 1 AND level <= 5),
  commission_rate DECIMAL(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create MLM commissions/earnings table
CREATE TABLE IF NOT EXISTS mlm_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  level INTEGER CHECK (level >= 1 AND level <= 5),
  amount DECIMAL(18, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'credited')),
  credited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wallet transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'earnings', 'investment')),
  amount DECIMAL(18, 2) NOT NULL,
  reference TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT,
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE mlm_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create RLS Policies for wallets
CREATE POLICY "Users can view their own wallet"
  ON wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
  ON wallets FOR UPDATE
  USING (auth.uid() = user_id);

-- Create RLS Policies for portfolios
CREATE POLICY "Users can view their portfolios"
  ON portfolios FOR SELECT
  USING (auth.uid() = owner_id OR auth.uid() = current_owner_id);

CREATE POLICY "Users can create portfolios"
  ON portfolios FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their portfolios"
  ON portfolios FOR UPDATE
  USING (auth.uid() = owner_id OR auth.uid() = current_owner_id);

-- Create RLS Policies for savings_plans
CREATE POLICY "Users can view their savings plans"
  ON savings_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = savings_plans.portfolio_id 
      AND (portfolios.owner_id = auth.uid() OR portfolios.current_owner_id = auth.uid())
    )
  );

-- Create RLS Policies for investments
CREATE POLICY "Users can view their investments"
  ON investments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM portfolios 
      WHERE portfolios.id = investments.portfolio_id 
      AND (portfolios.owner_id = auth.uid() OR portfolios.current_owner_id = auth.uid())
    )
  );

-- Create RLS Policies for referrals
CREATE POLICY "Users can view their referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Create RLS Policies for mlm_earnings
CREATE POLICY "Users can view their earnings"
  ON mlm_earnings FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = referrer_id);

-- Create RLS Policies for wallet_transactions
CREATE POLICY "Users can view their transactions"
  ON wallet_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wallets
      WHERE wallets.id = wallet_transactions.wallet_id
      AND wallets.user_id = auth.uid()
    )
  );

-- Create RLS Policies for notifications
CREATE POLICY "Users can view their notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_portfolios_owner_id ON portfolios(owner_id);
CREATE INDEX idx_portfolios_current_owner_id ON portfolios(current_owner_id);
CREATE INDEX idx_savings_plans_portfolio_id ON savings_plans(portfolio_id);
CREATE INDEX idx_investments_portfolio_id ON investments(portfolio_id);
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX idx_mlm_earnings_user_id ON mlm_earnings(user_id);
CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
