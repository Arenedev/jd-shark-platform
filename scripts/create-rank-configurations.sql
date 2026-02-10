-- Create rank_configurations table
CREATE TABLE IF NOT EXISTS rank_configurations (
  id BIGSERIAL PRIMARY KEY,
  rank_name VARCHAR(50) UNIQUE NOT NULL,
  rank_order INTEGER NOT NULL,
  pc_requirement BIGINT NOT NULL DEFAULT 0,
  nc_requirement BIGINT NOT NULL DEFAULT 0,
  pc_earning_rate DECIMAL(5,2) NOT NULL DEFAULT 5,
  network_earning_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  grand_network_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  vnc_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  rank_bonus BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Insert rank configurations for associates
INSERT INTO rank_configurations (rank_name, rank_order, pc_requirement, nc_requirement, pc_earning_rate, rank_bonus)
VALUES
  ('fin_starter', 1, 0, 0, 5, 0),
  ('investor', 2, 1000000, 0, 6, 50000),
  ('capital_investor', 3, 5000000, 0, 7, 100000),
  ('core_investor', 4, 10000000, 0, 8, 200000),
  ('alpha_investor', 5, 50000000, 0, 9, 500000),
  ('grand_alpha', 6, 100000000, 0, 10, 1000000),
  ('apex_alpha', 7, 500000000, 0, 11, 5000000),
  ('grand_star_investor', 8, 1000000000, 0, 12, 10000000)
ON CONFLICT (rank_name) DO NOTHING;

-- Create index on rank_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_rank_configs_rank_name ON rank_configurations(rank_name);
CREATE INDEX IF NOT EXISTS idx_rank_configs_rank_order ON rank_configurations(rank_order);
