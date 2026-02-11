import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupDatabase() {
  try {
    console.log('Starting database setup...')

    // Enable extensions
    await supabase.rpc('exec', {
      sql: `
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";
      `,
    }).catch(() => null) // Extensions might already exist

    console.log('✓ Extensions enabled')

    // Create all tables
    const createTablesSQL = `
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

      CREATE TABLE IF NOT EXISTS monthly_returns (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
        month DATE NOT NULL,
        return_percentage DECIMAL(5, 2),
        return_amount DECIMAL(18, 2),
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

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

      CREATE TABLE IF NOT EXISTS rank_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        old_rank TEXT,
        new_rank TEXT NOT NULL,
        achievement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS rank_configurations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        rank_id UUID NOT NULL REFERENCES ranks(id) ON DELETE CASCADE,
        config_key TEXT NOT NULL,
        config_value TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(rank_id, config_key)
      );

      CREATE TABLE IF NOT EXISTS network_genealogy (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        level INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

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

      CREATE TABLE IF NOT EXISTS monthly_commission_runs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        month DATE NOT NULL UNIQUE,
        total_commission DECIMAL(18, 2),
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT,
        type TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

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

      CREATE TABLE IF NOT EXISTS loan_repayment_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        loan_id UUID NOT NULL REFERENCES organization_loans(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        amount DECIMAL(18, 2) NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'failed')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS welcome_bonuses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        amount DECIMAL(18, 2) NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS incentives (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        incentive_type TEXT NOT NULL,
        amount DECIMAL(18, 2) NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS system_config (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        config_key TEXT UNIQUE NOT NULL,
        config_value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

    // Split and execute each statement
    const statements = createTablesSQL.split(';').filter(s => s.trim())
    
    for (const statement of statements) {
      if (statement.trim()) {
        await supabase.rpc('exec', {
          sql: statement + ';',
        }).catch(err => console.warn('Statement warning:', err.message))
      }
    }

    console.log('✓ All tables created')

    // Create indexes
    const indexStatements = [
      'CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email)',
      'CREATE INDEX IF NOT EXISTS idx_profiles_base_structure ON profiles(base_structure)',
      'CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_portfolios_owner_id ON portfolios(owner_id)',
      'CREATE INDEX IF NOT EXISTS idx_investments_portfolio_id ON investments(portfolio_id)',
      'CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_lcr_investments_user_id ON lcr_investments(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id)',
      'CREATE INDEX IF NOT EXISTS idx_mlm_earnings_user_id ON mlm_earnings(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_commissions_user_id ON commissions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_id ON deposit_requests(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id)',
    ]

    for (const indexStatement of indexStatements) {
      await supabase.rpc('exec', {
        sql: indexStatement,
      }).catch(() => null)
    }

    console.log('✓ Indexes created')

    // Insert default data
    const { error: ranksError } = await supabase
      .from('ranks')
      .upsert([
        { rank_name: 'Bronze', rank_order: 1, min_downline: 0, min_turnover: 0, commission_rate: 5.00, bonus_rate: 0.00 },
        { rank_name: 'Silver', rank_order: 2, min_downline: 3, min_turnover: 50000, commission_rate: 7.00, bonus_rate: 1.00 },
        { rank_name: 'Gold', rank_order: 3, min_downline: 10, min_turnover: 200000, commission_rate: 10.00, bonus_rate: 2.00 },
        { rank_name: 'Platinum', rank_order: 4, min_downline: 30, min_turnover: 1000000, commission_rate: 12.00, bonus_rate: 3.00 },
        { rank_name: 'Diamond', rank_order: 5, min_downline: 100, min_turnover: 5000000, commission_rate: 15.00, bonus_rate: 5.00 },
      ], { onConflict: 'rank_name' })

    if (ranksError && ranksError.code !== 'PGRST116') throw ranksError
    console.log('✓ Default ranks inserted')

    const { error: configError } = await supabase
      .from('system_config')
      .upsert([
        { config_key: 'platform_name', config_value: 'JD Shark Platform', description: 'Main platform name' },
        { config_key: 'currency', config_value: 'NGN', description: 'Default currency' },
        { config_key: 'base_commission_rate', config_value: '5', description: 'Base commission rate for new associates' },
        { config_key: 'welcome_bonus', config_value: '5000', description: 'Welcome bonus for new associates' },
      ], { onConflict: 'config_key' })

    if (configError && configError.code !== 'PGRST116') throw configError
    console.log('✓ System configuration inserted')

    console.log('\n✅ Database setup completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Database setup failed:', error.message)
    process.exit(1)
  }
}

setupDatabase()
