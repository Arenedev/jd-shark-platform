-- Comprehensive profiles RLS policies fix
-- ========================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles (fixed)" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles (fixed)" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- User SELECT policy - users can read their own profile
CREATE POLICY "users_select_own" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- User UPDATE policy - users can update their own profile
CREATE POLICY "users_update_own" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admin SELECT policy - admins can read all profiles (without self-reference)
CREATE POLICY "admins_select_all" 
ON public.profiles 
FOR SELECT 
USING (auth.jwt() ->> 'is_admin' = 'true');

-- Admin UPDATE policy - admins can update all profiles
CREATE POLICY "admins_update_all" 
ON public.profiles 
FOR UPDATE 
USING (auth.jwt() ->> 'is_admin' = 'true')
WITH CHECK (auth.jwt() ->> 'is_admin' = 'true');

-- Allow SELECT from sign-up flow (before user is fully authenticated)
CREATE POLICY "allow_anonymous_signup_check"
ON public.profiles
FOR SELECT
USING (true);
