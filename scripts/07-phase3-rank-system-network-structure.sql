-- ================================================
-- PHASE 3: RANK SYSTEM & NETWORK STRUCTURE
-- ================================================

-- Create ranks configuration table
CREATE TABLE IF NOT EXISTS ranks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rank_name TEXT NOT NULL UNIQUE,
  rank_order INTEGER NOT NULL UNIQUE,
  min_pc DECIMAL(18, 2) NOT NULL,
  min_nc DECIMAL(18, 2),
  pc_roi_percentage DECIMAL(5, 2) NOT NULL,
  nc_commission_percentage DECIMAL(5, 2) DEFAULT 0,
  gnc_commission_percentage DECIMAL(5, 2) DEFAULT 0,
  vnc_commission_percentage DECIMAL(5, 2) DEFAULT 0,
  min_guaranteed_percentage DECIMAL(5, 2) DEFAULT 0,
  welcome_bonus_multiplier DECIMAL(5, 2) DEFAULT 0,
  special_perks JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert rank data based on business document
INSERT INTO ranks (rank_name, rank_order, min_pc, min_nc, pc_roi_percentage, nc_commission_percentage, min_guaranteed_percentage, welcome_bonus_multiplier, special_perks) VALUES
  ('Fin Starter', 1, 500000, 1000000, 5.00, 0, 0, 0, '{"requirements": ["Save minimum 500k PC or 1M NC"]}'),
  ('Investor', 2, 5000000, 10000000, 6.00, 0, 0, 0, '{"requirements": ["Save minimum 500k PC", "Total PC of 5M or NC of 10M"]}'),
  ('Capital Investor', 3, 25000000, 50000000, 6.00, 1.00, 0, 0, '{"requirements": ["Save minimum 5M PC", "Total PC of 25M or NC of 50M"]}'),
  ('Core Investor', 4, 50000000, 100000000, 7.00, 2.00, 1.00, 0.5, '{"requirements": ["Save minimum 5M PC", "Total PC of 50M or NC of 100M"], "perks": ["Welcome bonus (1/2 Yearly returns)"]}'),
  ('Alpha Investor', 5, 250000000, 500000000, 8.00, 4.00, 2.00, 0.5, '{"requirements": ["Save minimum 25M PC", "Total PC of 250M or NC of 500M"], "perks": ["Brand new Sedan/SUV car", "Sponsored vacation", "Leadership title"]}'),
  ('Grand Alpha', 6, 250000000, 500000000, 8.00, 4.00, 2.00, 0.67, '{"requirements": ["Produce an Alpha"], "bonus": "0.6% on GNC"}'),
  ('Apex Alpha', 7, 250000000, 500000000, 8.00, 4.00, 2.00, 0.33, '{"requirements": ["Support your Alpha to produce an Alpha"], "bonus": "0.4% on VNC"}'),
  ('Star 1', 8, 1000000000, 5000000000, 9.00, 5.00, 3.00, 1.0, '{"requirements": ["1B PC / 5B NC"]}'),
  ('Star 2', 9, 5000000000, 25000000000, 10.00, 6.00, 4.00, 1.5, '{"requirements": ["5B PC / 25B NC"]}'),
  ('Star 3', 10, 10000000000, 50000000000, 11.00, 7.00, 5.00, 2.0, '{"requirements": ["10B PC / 50B NC"]}')
ON CONFLICT (rank_name) DO NOTHING;

-- Update profiles table for rank tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rank_id UUID REFERENCES ranks(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rank_achieved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS previous_rank TEXT;

-- Create network_genealogy table for tracking network structure
CREATE TABLE IF NOT EXISTS network_genealogy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  generation INTEGER NOT NULL,
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  root_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, parent_id, root_id, generation)
);

-- Create indexes for genealogy queries
CREATE INDEX IF NOT EXISTS idx_network_genealogy_user ON network_genealogy(user_id);
CREATE INDEX IF NOT EXISTS idx_network_genealogy_root ON network_genealogy(root_id, generation);
CREATE INDEX IF NOT EXISTS idx_network_genealogy_parent ON network_genealogy(parent_id);

-- Create rank_history table to track rank changes
CREATE TABLE IF NOT EXISTS rank_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  old_rank TEXT,
  new_rank TEXT NOT NULL,
  reason TEXT,
  pc_at_time DECIMAL(18, 2),
  nc_at_time DECIMAL(18, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to calculate Network Capital (NC) - sum of all PC in user's network
CREATE OR REPLACE FUNCTION calculate_network_capital(p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_network_capital DECIMAL;
BEGIN
  -- Sum all PC from direct and indirect referrals
  SELECT COALESCE(SUM(p.personal_capital), 0)
  INTO v_network_capital
  FROM profiles p
  WHERE p.id IN (
    SELECT DISTINCT ng.user_id
    FROM network_genealogy ng
    WHERE ng.root_id = p_user_id
  );
  
  RETURN v_network_capital;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate Grand Network Capital (GNC) - for Grand Alpha and above
CREATE OR REPLACE FUNCTION calculate_grand_network_capital(p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_gnc DECIMAL;
BEGIN
  -- Sum all PC from Alpha+ rank downlines
  SELECT COALESCE(SUM(p.personal_capital), 0)
  INTO v_gnc
  FROM profiles p
  JOIN ranks r ON p.rank_id = r.id
  WHERE r.rank_order >= 5 -- Alpha or higher
    AND p.id IN (
      SELECT DISTINCT ng.user_id
      FROM network_genealogy ng
      WHERE ng.root_id = p_user_id
    );
  
  RETURN v_gnc;
END;
$$ LANGUAGE plpgsql;

-- Function to determine rank based on PC and NC
CREATE OR REPLACE FUNCTION determine_rank(p_pc DECIMAL, p_nc DECIMAL)
RETURNS UUID AS $$
DECLARE
  v_rank_id UUID;
BEGIN
  SELECT id INTO v_rank_id
  FROM ranks
  WHERE p_pc >= min_pc 
    OR (min_nc IS NOT NULL AND p_nc >= min_nc)
  ORDER BY rank_order DESC
  LIMIT 1;
  
  RETURN v_rank_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update user rank
CREATE OR REPLACE FUNCTION update_user_rank(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_pc DECIMAL;
  v_nc DECIMAL;
  v_new_rank_id UUID;
  v_old_rank TEXT;
  v_new_rank TEXT;
BEGIN
  -- Calculate current PC and NC
  v_pc := calculate_personal_capital(p_user_id);
  v_nc := calculate_network_capital(p_user_id);
  
  -- Get current rank
  SELECT current_rank INTO v_old_rank FROM profiles WHERE id = p_user_id;
  
  -- Determine new rank
  v_new_rank_id := determine_rank(v_pc, v_nc);
  
  IF v_new_rank_id IS NOT NULL THEN
    SELECT rank_name INTO v_new_rank FROM ranks WHERE id = v_new_rank_id;
    
    -- Only update if rank changed
    IF v_old_rank IS NULL OR v_old_rank != v_new_rank THEN
      -- Update profile
      UPDATE profiles 
      SET 
        rank_id = v_new_rank_id,
        current_rank = v_new_rank,
        previous_rank = v_old_rank,
        rank_achieved_at = NOW(),
        personal_capital = v_pc,
        network_capital = v_nc
      WHERE id = p_user_id;
      
      -- Record in history
      INSERT INTO rank_history (user_id, old_rank, new_rank, pc_at_time, nc_at_time, reason)
      VALUES (p_user_id, v_old_rank, v_new_rank, v_pc, v_nc, 'Automatic rank advancement');
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to build network genealogy when referral is created
CREATE OR REPLACE FUNCTION build_network_genealogy(p_referred_id UUID, p_referrer_id UUID)
RETURNS VOID AS $$
DECLARE
  v_generation INTEGER := 1;
  v_current_parent UUID := p_referrer_id;
BEGIN
  -- Insert direct referral (generation 1)
  INSERT INTO network_genealogy (user_id, parent_id, root_id, generation)
  VALUES (p_referred_id, p_referrer_id, p_referrer_id, 1)
  ON CONFLICT DO NOTHING;
  
  -- Build upline genealogy (up to generation 10 for comprehensive tracking)
  WHILE v_current_parent IS NOT NULL AND v_generation < 10 LOOP
    v_generation := v_generation + 1;
    
    -- Find the parent's referrer
    SELECT referrer_id INTO v_current_parent
    FROM referrals
    WHERE referred_id = v_current_parent
    LIMIT 1;
    
    IF v_current_parent IS NOT NULL THEN
      INSERT INTO network_genealogy (user_id, parent_id, root_id, generation)
      VALUES (p_referred_id, v_current_parent, v_current_parent, v_generation)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to build genealogy when referral is created
CREATE OR REPLACE FUNCTION trigger_build_genealogy()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM build_network_genealogy(NEW.referred_id, NEW.referrer_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_referral_insert
  AFTER INSERT ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_build_genealogy();

-- Add comments
COMMENT ON TABLE ranks IS 'Rank configuration with PC/NC thresholds and commission rates';
COMMENT ON TABLE network_genealogy IS 'Tracks network structure and genealogy for commission calculations';
COMMENT ON TABLE rank_history IS 'Historical record of rank changes for users';
COMMENT ON FUNCTION calculate_network_capital IS 'Calculates total PC of all network members';
COMMENT ON FUNCTION update_user_rank IS 'Automatically determines and updates user rank based on PC/NC';
