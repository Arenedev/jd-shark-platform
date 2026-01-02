-- Seed Demo User Data for JD SHARK Platform
-- Run this script to populate demo data for testing

-- First, we need to insert the auth user in Supabase
-- Since we can't directly insert into auth.users via SQL, you'll need to:
-- 1. Create the user via Supabase dashboard or auth API
-- 2. Then run this script to add profile and related data

-- Demo User Details:
-- Email: demo@jdshark.com
-- Password: Demo@12345
-- This user will have sample portfolios, investments, and referral data

-- Get the user ID (you'll need to replace this with the actual user ID from Supabase auth)
-- For this example, we'll use a placeholder UUID that you'll need to update

DO $$
DECLARE
  demo_user_id UUID := 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid; -- REPLACE WITH ACTUAL USER ID
  portfolio_id_1 UUID;
  portfolio_id_2 UUID;
  investment_id_1 UUID;
  investment_id_2 UUID;
  wallet_id UUID;
BEGIN
  
  -- Insert demo profile
  INSERT INTO profiles (id, username, email, full_name, phone, country, nin_or_bvn, kyc_status, bank_account_name, bank_account_number, bank_name)
  VALUES (
    demo_user_id,
    'demo_user',
    'demo@jdshark.com',
    'Demo User',
    '+234 703 000 0000',
    'Nigeria',
    '12345678901',
    'approved',
    'Demo User Account',
    '0123456789',
    'First Bank'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create wallet for demo user
  INSERT INTO wallets (user_id, balance, total_funded, total_withdrawn)
  VALUES (demo_user_id, 500000.00, 1000000.00, 500000.00)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO wallet_id;

  -- Create first portfolio (Personal)
  INSERT INTO portfolios (owner_id, current_owner_id, name, portfolio_type, total_balance)
  VALUES (demo_user_id, demo_user_id, 'My Savings', 'Personal', 300000.00)
  RETURNING id INTO portfolio_id_1;

  -- Create second portfolio (For Others)
  INSERT INTO portfolios (owner_id, current_owner_id, name, portfolio_type, total_balance)
  VALUES (demo_user_id, demo_user_id, 'College Fund - Sarah', 'For Others', 150000.00)
  RETURNING id INTO portfolio_id_2;

  -- Create investments in first portfolio
  INSERT INTO investments (portfolio_id, amount, start_date, maturity_date, roi_percentage, status, auto_reinvest)
  VALUES (
    portfolio_id_1,
    200000.00,
    CURRENT_DATE - INTERVAL '3 months',
    CURRENT_DATE + INTERVAL '9 months',
    100,
    'active',
    true
  )
  RETURNING id INTO investment_id_1;

  INSERT INTO investments (portfolio_id, amount, start_date, maturity_date, roi_percentage, status, auto_reinvest)
  VALUES (
    portfolio_id_1,
    100000.00,
    CURRENT_DATE - INTERVAL '1 month',
    CURRENT_DATE + INTERVAL '11 months',
    100,
    'active',
    false
  )
  RETURNING id INTO investment_id_2;

  -- Create investment in second portfolio
  INSERT INTO investments (portfolio_id, amount, start_date, maturity_date, roi_percentage, status, auto_reinvest)
  VALUES (
    portfolio_id_2,
    150000.00,
    CURRENT_DATE - INTERVAL '2 months',
    CURRENT_DATE + INTERVAL '10 months',
    100,
    'active',
    true
  )
  RETURNING id INTO investment_id_1;

  -- Create wallet transactions
  INSERT INTO wallet_transactions (wallet_id, type, amount, reference, status, description)
  VALUES 
    (wallet_id, 'deposit', 500000.00, 'PAY-2024-001', 'completed', 'Initial deposit via Paystack'),
    (wallet_id, 'investment', 200000.00, 'INV-2024-001', 'completed', 'Investment in My Savings - 3 months'),
    (wallet_id, 'investment', 100000.00, 'INV-2024-002', 'completed', 'Investment in My Savings - 1 month'),
    (wallet_id, 'investment', 150000.00, 'INV-2024-003', 'completed', 'Investment in College Fund'),
    (wallet_id, 'withdrawal', 500000.00, 'WD-2024-001', 'completed', 'Withdrawal to bank account');

  -- Create sample referral (referrer of 2 people)
  INSERT INTO referrals (referrer_id, referred_id, level, commission_rate)
  VALUES (demo_user_id, '550e8400-e29b-41d4-a716-446655440001'::uuid, 1, 10.00)
  ON CONFLICT DO NOTHING;

  INSERT INTO referrals (referrer_id, referred_id, level, commission_rate)
  VALUES (demo_user_id, '550e8400-e29b-41d4-a716-446655440002'::uuid, 1, 10.00)
  ON CONFLICT DO NOTHING;

  -- Create sample MLM earnings
  INSERT INTO mlm_earnings (user_id, investment_id, referrer_id, level, amount, status, credited_at)
  VALUES 
    (demo_user_id, investment_id_1, '550e8400-e29b-41d4-a716-446655440003'::uuid, 1, 20000.00, 'credited', NOW() - INTERVAL '1 week'),
    (demo_user_id, investment_id_2, '550e8400-e29b-41d4-a716-446655440003'::uuid, 2, 10000.00, 'credited', NOW() - INTERVAL '2 weeks');

  -- Create sample notifications
  INSERT INTO notifications (user_id, type, title, message, read)
  VALUES 
    (demo_user_id, 'investment_matured', 'Investment Matured', 'Your investment of 200,000 NGN has matured. Click to claim your earnings.', false),
    (demo_user_id, 'referral_earned', 'Referral Earnings', 'You earned 20,000 NGN from your referral. Check your MLM dashboard.', false),
    (demo_user_id, 'deposit_successful', 'Deposit Successful', 'Your wallet has been credited with 500,000 NGN.', true);

  RAISE NOTICE 'Demo user data seeded successfully!';
  RAISE NOTICE 'Demo user ID: %', demo_user_id;
  RAISE NOTICE 'Email: demo@jdshark.com';
  RAISE NOTICE 'Password: Demo@12345';
  
END $$;
