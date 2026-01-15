-- Update existing users to have a default base_structure
-- This script sets base_structure for users who don't have one yet

UPDATE profiles 
SET base_structure = 'investor',
    current_rank = 'fin_starter'
WHERE base_structure IS NULL;

-- Log the update
SELECT 
  COUNT(*) as updated_users,
  'Updated users with null base_structure to investor' as message
FROM profiles 
WHERE base_structure = 'investor';
