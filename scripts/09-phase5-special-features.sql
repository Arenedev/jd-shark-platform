CREATE TABLE IF NOT EXISTS organization_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  principal_amount DECIMAL(18, 2) NOT NULL,
  monthly_interest_rate DECIMAL(5, 2) DEFAULT 0.5,
  total_due DECIMAL(18, 2) NOT NULL,
  amount_paid DECIMAL(18, 2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'paid', 'defaulted')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loan_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES organization_loans(id) ON DELETE CASCADE,
  amount DECIMAL(18, 2) NOT NULL,
  interest_portion DECIMAL(18, 2),
  principal_portion DECIMAL(18, 2),
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS welcome_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rank_id UUID NOT NULL REFERENCES ranks(id),
  rank_name TEXT NOT NULL,
  bonus_amount DECIMAL(18, 2) NOT NULL,
  bonus_type TEXT NOT NULL CHECK (bonus_type IN ('half_yearly', 'two_thirds_yearly', 'full_yearly')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'cancelled')),
  credited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incentives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rank_id UUID REFERENCES ranks(id),
  incentive_type TEXT NOT NULL CHECK (incentive_type IN (
    'car', 'vacation', 'leadership_title', 'special_recognition', 
    'lcr_bonus', 'organization_referral', 'other'
  )),
  title TEXT NOT NULL,
  description TEXT,
  value_amount DECIMAL(18, 2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'awarded', 'claimed', 'expired')),
  awarded_at TIMESTAMP WITH TIME ZONE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_org_loans_org ON organization_loans(organization_id, status);
CREATE INDEX idx_loan_payments_loan ON loan_payments(loan_id);
CREATE INDEX idx_welcome_bonuses_user ON welcome_bonuses(user_id, status);
CREATE INDEX idx_incentives_user ON incentives(user_id, status);

CREATE OR REPLACE FUNCTION calculate_loan_eligibility(p_user_id UUID)
RETURNS TABLE(
  eligible BOOLEAN,
  max_loan_amount DECIMAL,
  investment_portfolio_value DECIMAL
) AS $$
DECLARE
  v_profile RECORD;
  v_portfolio_value DECIMAL;
BEGIN
  SELECT base_structure, personal_capital INTO v_profile
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_profile.base_structure != 'organization' THEN
    RETURN QUERY SELECT FALSE, 0::DECIMAL, 0::DECIMAL;
    RETURN;
  END IF;
  
  v_portfolio_value := COALESCE(v_profile.personal_capital, 0);
  
  RETURN QUERY SELECT 
    TRUE,
    v_portfolio_value * 0.8,
    v_portfolio_value;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_welcome_bonus(
  p_user_id UUID,
  p_rank_id UUID
)
RETURNS DECIMAL AS $$
DECLARE
  v_rank RECORD;
  v_personal_capital DECIMAL;
  v_yearly_returns DECIMAL;
  v_bonus_amount DECIMAL;
BEGIN
  SELECT * INTO v_rank FROM ranks WHERE id = p_rank_id;
  
  SELECT personal_capital INTO v_personal_capital
  FROM profiles
  WHERE id = p_user_id;
  
  v_yearly_returns := v_personal_capital * (v_rank.pc_roi_percentage / 100);
  
  CASE v_rank.rank_name
    WHEN 'Core Investor' THEN
      v_bonus_amount := v_yearly_returns * 0.5;
    WHEN 'Alpha Investor' THEN
      v_bonus_amount := v_yearly_returns * 0.5;
    WHEN 'Grand Alpha Investor' THEN
      v_bonus_amount := v_yearly_returns * 0.67;
    WHEN 'Apex Alpha Investor' THEN
      v_bonus_amount := v_yearly_returns * 0.33;
    ELSE
      v_bonus_amount := 0;
  END CASE;
  
  RETURN v_bonus_amount;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_welcome_bonus()
RETURNS TRIGGER AS $$
DECLARE
  v_bonus_amount DECIMAL;
BEGIN
  IF NEW.rank_id IS DISTINCT FROM OLD.rank_id AND NEW.rank_id IS NOT NULL THEN
    SELECT calculate_welcome_bonus(NEW.id, NEW.rank_id) INTO v_bonus_amount;
    
    IF v_bonus_amount > 0 THEN
      INSERT INTO welcome_bonuses (user_id, rank_id, rank_name, bonus_amount, bonus_type)
      SELECT 
        NEW.id,
        NEW.rank_id,
        r.rank_name,
        v_bonus_amount,
        CASE r.rank_name
          WHEN 'Core Investor' THEN 'half_yearly'
          WHEN 'Alpha Investor' THEN 'half_yearly'
          WHEN 'Grand Alpha Investor' THEN 'two_thirds_yearly'
          WHEN 'Apex Alpha Investor' THEN 'full_yearly'
        END
      FROM ranks r
      WHERE r.id = NEW.rank_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profile_rank_change_bonus
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.rank_id IS DISTINCT FROM OLD.rank_id)
  EXECUTE FUNCTION trigger_welcome_bonus();

CREATE OR REPLACE FUNCTION award_rank_incentives(
  p_user_id UUID,
  p_rank_name TEXT
)
RETURNS VOID AS $$
BEGIN
  CASE p_rank_name
    WHEN 'Alpha Investor' THEN
      INSERT INTO incentives (user_id, incentive_type, title, description, status)
      VALUES 
        (p_user_id, 'car', 'Brand New Sedan/SUV', 'Congratulations on achieving Alpha Investor status!', 'pending'),
        (p_user_id, 'vacation', 'Sponsored Family/Team Vacation', 'Enjoy a well-deserved vacation with your loved ones', 'pending'),
        (p_user_id, 'leadership_title', 'Leadership Recognition', 'Official recognition as a JD Shark leader', 'awarded');
    
    WHEN 'Grand Alpha Investor', 'Apex Alpha Investor' THEN
      INSERT INTO incentives (user_id, incentive_type, title, description, status)
      VALUES 
        (p_user_id, 'vacation', 'Sponsored Family/Team Vacation', 'Premium vacation package for Grand Alpha achievement', 'pending'),
        (p_user_id, 'leadership_title', 'Leadership Recognition', 'Elite status recognition as a JD Shark leader', 'awarded');
  END CASE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION process_organization_referral_commission(
  p_referrer_id UUID,
  p_referred_org_id UUID,
  p_amount DECIMAL
)
RETURNS UUID AS $$
DECLARE
  v_commission_amount DECIMAL;
  v_commission_id UUID;
BEGIN
  v_commission_amount := p_amount * 0.01;
  
  INSERT INTO commissions (
    user_id,
    source_user_id,
    commission_type,
    amount,
    percentage_rate,
    status,
    notes
  ) VALUES (
    p_referrer_id,
    p_referred_org_id,
    'organization_referral',
    v_commission_amount,
    1.00,
    'pending',
    'Organization referral commission'
  )
  RETURNING id INTO v_commission_id;
  
  RETURN v_commission_id;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE organization_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE welcome_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incentives ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_view_own_loans ON organization_loans
  FOR SELECT
  USING (auth.uid() = organization_id);

CREATE POLICY users_view_own_loan_payments ON loan_payments
  FOR SELECT
  USING (loan_id IN (SELECT id FROM organization_loans WHERE organization_id = auth.uid()));

CREATE POLICY users_view_own_bonuses ON welcome_bonuses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY users_view_own_incentives ON incentives
  FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE organization_loans IS 'Organization loans at 0.5% monthly interest up to 80% of portfolio value';
COMMENT ON TABLE welcome_bonuses IS 'Welcome bonuses for rank advancement (Core Investor and above)';
COMMENT ON TABLE incentives IS 'Track special incentives like cars, vacations, and leadership titles';
COMMENT ON FUNCTION calculate_loan_eligibility IS 'Check if organization is eligible for loan and max amount';
COMMENT ON FUNCTION calculate_welcome_bonus IS 'Calculate welcome bonus based on rank and yearly returns';
