-- ================================================
-- PHASE 2: PERSONAL CAPITAL & WITHDRAWALS
-- ================================================

-- Add returns_balance to wallets table
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS returns_balance DECIMAL(18, 2) DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS locked_capital DECIMAL(18, 2) DEFAULT 0;

-- Update profiles to track PC properly
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS personal_capital DECIMAL(18, 2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS network_capital DECIMAL(18, 2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_rank TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS base_structure TEXT CHECK (base_structure IN ('investor', 'organization', 'associate'));

-- Add withdrawal_type column to track source of withdrawal
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS withdrawal_source TEXT DEFAULT 'returns' CHECK (withdrawal_source IN ('returns', 'capital'));

-- Create a view for easy balance calculation
CREATE OR REPLACE VIEW user_balances AS
SELECT 
  p.id as user_id,
  p.personal_capital,
  COALESCE(SUM(CASE WHEN i.status = 'active' THEN i.principal ELSE 0 END), 0) as locked_capital,
  COALESCE(SUM(mr.return_amount), 0) as total_returns_earned,
  w.balance as wallet_balance,
  w.returns_balance,
  (w.returns_balance - COALESCE(SUM(CASE WHEN wr.status = 'pending' THEN wr.amount ELSE 0 END), 0)) as available_for_withdrawal
FROM profiles p
LEFT JOIN investments i ON i.portfolio_id IN (SELECT id FROM portfolios WHERE owner_id = p.id)
LEFT JOIN monthly_returns mr ON mr.user_id = p.id AND mr.credited_to_wallet = true
LEFT JOIN wallets w ON w.user_id = p.id
LEFT JOIN withdrawal_requests wr ON wr.user_id = p.id
GROUP BY p.id, w.balance, w.returns_balance;

-- Function to calculate PC from approved deposits
CREATE OR REPLACE FUNCTION calculate_personal_capital(p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_total_pc DECIMAL;
BEGIN
  SELECT COALESCE(SUM(i.principal), 0)
  INTO v_total_pc
  FROM investments i
  JOIN portfolios po ON i.portfolio_id = po.id
  WHERE po.owner_id = p_user_id
    AND i.status = 'active'
    AND i.approved_at IS NOT NULL;
  
  RETURN v_total_pc;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate returns balance
CREATE OR REPLACE FUNCTION calculate_returns_balance(p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_returns_balance DECIMAL;
BEGIN
  SELECT COALESCE(SUM(mr.return_amount), 0)
  INTO v_returns_balance
  FROM monthly_returns mr
  WHERE mr.user_id = p_user_id
    AND mr.credited_to_wallet = true;
  
  -- Subtract approved withdrawals
  v_returns_balance := v_returns_balance - COALESCE(
    (SELECT SUM(amount) FROM withdrawal_requests 
     WHERE user_id = p_user_id AND status = 'approved'),
    0
  );
  
  RETURN v_returns_balance;
END;
$$ LANGUAGE plpgsql;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_monthly_returns_user_credited ON monthly_returns(user_id, credited_to_wallet);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_status ON withdrawal_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_investments_portfolio ON investments(portfolio_id);

-- Add comments
COMMENT ON COLUMN wallets.returns_balance IS 'Balance from investment returns only, available for withdrawal';
COMMENT ON COLUMN wallets.locked_capital IS 'Principal amount locked in active investments, not withdrawable';
COMMENT ON COLUMN withdrawal_requests.withdrawal_source IS 'Source of withdrawal: returns (withdrawable) or capital (locked)';
COMMENT ON VIEW user_balances IS 'Aggregated view of user capital, returns, and available withdrawal amounts';
