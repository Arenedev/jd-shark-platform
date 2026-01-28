-- Insert default system configuration values
INSERT INTO public.system_config (config_key, config_value, description)
VALUES 
  ('base_monthly_roi', '1.0', 'Base monthly ROI percentage for investments'),
  ('lcr_1year_bonus', '5.0', 'Additional ROI percentage for 1-year LCR lock'),
  ('lcr_10year_bonus', '10.0', 'Additional ROI percentage for 10-year LCR lock')
ON CONFLICT (config_key) DO NOTHING;
