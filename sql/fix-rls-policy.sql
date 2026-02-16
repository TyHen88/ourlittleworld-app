-- Fix RLS Policy for Profile Creation
-- Run this in Supabase SQL Editor

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create a more permissive INSERT policy that allows profile creation during signup
CREATE POLICY "Enable insert for authentication" 
  ON profiles FOR INSERT 
  WITH CHECK (true);

-- Alternative: If you want to keep it strict, use this instead:
-- CREATE POLICY "Users can insert their own profile" 
--   ON profiles FOR INSERT 
--   WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);
