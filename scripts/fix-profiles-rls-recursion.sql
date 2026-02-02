-- Fix infinite recursion in profiles RLS policies
-- ============================================

-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

-- Replace with simpler admin policies that don't self-reference
CREATE POLICY "Admins can view all profiles (fixed)" 
ON public.profiles 
FOR SELECT 
USING (auth.jwt() ->> 'is_admin' = 'true');

CREATE POLICY "Admins can update profiles (fixed)" 
ON public.profiles 
FOR UPDATE 
USING (auth.jwt() ->> 'is_admin' = 'true')
WITH CHECK (auth.jwt() ->> 'is_admin' = 'true');

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Profiles RLS policies fixed - infinite recursion removed!';
  RAISE NOTICE 'Users can now update their own profile and KYC information.';
  RAISE NOTICE 'Admins can now read and update all profiles without recursion.';
END $$;
