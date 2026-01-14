-- ================================================
-- PHASE 4: NETWORK COMMISSIONS
-- ================================================

-- Create commissions table to track all commission earnings
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
  commission_type TEXT NOT NULL CHECK (commission_type IN ('pc_roi', 'nc_commission', 'gnc_commission', 'vnc_commission', 'minimum_guaranteed')),
  generation INTEGER,
  amount DECIMAL(18, 2) NOT NULL,
  percentage_rate DECIMAL(5, 2) NOT NULL,
  calculation_period TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'failed')),
  credited_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for commission queries
CREATE INDEX IF NOT EXISTS idx_commissions_user ON commissions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_commissions_source ON commissions(source_user_id, calculation_period);
CREATE INDEX IF NOT EXISTS idx_commissions_period ON commissions(calculation_period, status);

-- Create monthly_commission_runs table to track processing
CREATE TABLE IF NOT EXISTS monthly_commission_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_period TEXT NOT NULL UNIQUE,
  total_amount_distributed DECIMAL(18, 2) DEFAULT 0,
  total_commissions_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Function to check if equal-rank stop rule applies
CREATE OR REPLACE FUNCTION check_equal_rank_stop(
  p_upline_rank_order INTEGER,
  p_downline_rank_order INTEGER,
  p_generation INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
  -- If downline has same or higher rank than upline and it's beyond Gen 1
  IF p_generation > 1 AND p_downline_rank_order >= p_upline_rank_order THEN
    RETURN TRUE; -- Stop commission
  END IF
  RETURN FALSE; -- Continue commission
END;
$$ LANGUAGE plpgsql;

-- Function to calculate commissions for a user's network
CREATE OR REPLACE FUNCTION calculate_network_commissions(
  p_user_id UUID,
  p_period TEXT
)
RETURNS TABLE (
  downline_id UUID,
  generation INTEGER,
  commission_type TEXT,
  amount DECIMAL,
  percentage DECIMAL
) AS $$
DECLARE
  v_user_rank RECORD;
  v_downline RECORD;
  v_commission_amount DECIMAL;
  v_stop_commission BOOLEAN;
BEGIN
  -- Get user's rank and commission rates
  SELECT r.* INTO v_user_rank
  FROM profiles p
  JOIN ranks r ON p.rank_id = r.id
  WHERE p.id = p_user_id;
  
  IF v_user_rank IS NULL THEN
    RETURN; -- User has no rank
  END IF
  
  -- Iterate through network genealogy
  FOR v_downline IN
    SELECT 
      ng.user_id as downline_id,
      ng.generation,
      p.personal_capital,
      p.rank_id,
      r.rank_order as downline_rank_order,
      COALESCE(rb.total_returns, 0) as returns_balance
    FROM network_genealogy ng
    JOIN profiles p ON ng.user_id = p.id
    LEFT JOIN ranks r ON p.rank_id = r.id
    LEFT JOIN user_balances_view rb ON rb.user_id = p.id
    WHERE ng.root_id = p_user_id
      AND rb.total_returns > 0 -- Only calculate on those with returns
    ORDER BY ng.generation
  LOOP
    -- Check equal-rank stop rule
    v_stop_commission := check_equal_rank_stop(
      v_user_rank.rank_order,
      v_downline.downline_rank_order,
      v_downline.generation
    );
    
    IF v_stop_commission THEN
      CONTINUE; -- Skip this downline due to equal-rank stop
    END IF
    
    -- Calculate NC commission based on downline's returns
    IF v_user_rank.nc_commission_percentage > 0 AND v_downline.generation <= 10 THEN
      v_commission_amount := (v_downline.returns_balance * v_user_rank.nc_commission_percentage / 100);
      
      -- Check minimum guaranteed
      IF v_user_rank.min_guaranteed_percentage > 0 THEN
        v_commission_amount := GREATEST(
          v_commission_amount,
          v_downline.returns_balance * v_user_rank.min_guaranteed_percentage / 100
        );
      END IF
      
      IF v_commission_amount > 0 THEN
        RETURN QUERY SELECT 
          v_downline.downline_id,
          v_downline.generation,
          'nc_commission'::TEXT,
          v_commission_amount,
          v_user_rank.nc_commission_percentage;
      END IF
    END IF
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to process monthly commissions for all users
CREATE OR REPLACE FUNCTION process_monthly_commissions(p_period TEXT)
RETURNS UUID AS $$
DECLARE
  v_run_id UUID;
  v_user RECORD;
  v_commission RECORD;
  v_total_amount DECIMAL := 0;
  v_total_count INTEGER := 0;
BEGIN
  -- Create commission run record
  INSERT INTO monthly_commission_runs (run_period, status)
  VALUES (p_period, 'in_progress')
  RETURNING id INTO v_run_id;
  
  -- Process commissions for each user
  FOR v_user IN
    SELECT DISTINCT p.id, p.email, p.full_name
    FROM profiles p
    WHERE p.rank_id IS NOT NULL
  LOOP
    -- Calculate commissions for this user's network
    FOR v_commission IN
      SELECT * FROM calculate_network_commissions(v_user.id, p_period)
    LOOP
      -- Insert commission record
      INSERT INTO commissions (
        user_id,
        source_user_id,
        commission_type,
        generation,
        amount,
        percentage_rate,
        calculation_period,
        status
      ) VALUES (
        v_user.id,
        v_commission.downline_id,
        v_commission.commission_type,
        v_commission.generation,
        v_commission.amount,
        v_commission.percentage,
        p_period,
        'pending'
      );
      
      v_total_amount := v_total_amount + v_commission.amount;
      v_total_count := v_total_count + 1;
    END LOOP;
  END LOOP;
  
  -- Update run record
  UPDATE monthly_commission_runs
  SET 
    status = 'completed',
    completed_at = NOW(),
    total_amount_distributed = v_total_amount,
    total_commissions_count = v_total_count
  WHERE id = v_run_id;
  
  RETURN v_run_id;
  
EXCEPTION WHEN OTHERS THEN
  -- Update run record with error
  UPDATE monthly_commission_runs
  SET 
    status = 'failed',
    completed_at = NOW(),
    error_message = SQLERRM
  WHERE id = v_run_id;
  
  RAISE;
END;
$$ LANGUAGE plpgsql;

-- Function to credit pending commissions to users
CREATE OR REPLACE FUNCTION credit_pending_commissions(p_period TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_commission RECORD;
  v_credited_count INTEGER := 0;
BEGIN
  FOR v_commission IN
    SELECT * FROM commissions
    WHERE calculation_period = p_period
      AND status = 'pending'
  LOOP
    -- Credit to returns_balance
    UPDATE user_balances_view
    SET returns_balance = returns_balance + v_commission.amount
    WHERE user_id = v_commission.user_id;
    
    -- Mark commission as credited
    UPDATE commissions
    SET 
      status = 'credited',
      credited_at = NOW()
    WHERE id = v_commission.id;
    
    -- Create transaction record
    INSERT INTO wallet_transactions (
      wallet_id,
      type,
      amount,
      status,
      description,
      metadata
    )
    SELECT 
      w.id,
      'commission',
      v_commission.amount,
      'completed',
      'Network commission from ' || v_commission.commission_type,
      jsonb_build_object(
        'commission_id', v_commission.id,
        'period', p_period,
        'source_user_id', v_commission.source_user_id
      )
    FROM wallets w
    WHERE w.user_id = v_commission.user_id;
    
    v_credited_count := v_credited_count + 1;
  END LOOP;
  
  RETURN v_credited_count;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on commissions
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own commissions
CREATE POLICY users_view_own_commissions ON commissions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE commissions IS 'Tracks all network commission earnings with equal-rank stop rule enforcement';
COMMENT ON TABLE monthly_commission_runs IS 'Records monthly commission processing runs';
COMMENT ON FUNCTION calculate_network_commissions IS 'Calculates commissions for a user based on network returns and rank rules';
COMMENT ON FUNCTION process_monthly_commissions IS 'Processes all commissions for a given month';
COMMENT ON FUNCTION credit_pending_commissions IS 'Credits pending commissions to user balances';
