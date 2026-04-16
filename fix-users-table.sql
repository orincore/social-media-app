-- Fix users table for NextAuth.js compatibility
-- Run this in Supabase SQL Editor

-- 1. Drop the foreign key constraint (if it exists)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- 2. Change id to auto-generate UUID if not already
ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Remove the Supabase Auth trigger (not needed for NextAuth)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 4. If you have existing data with null IDs, fix them:
-- UPDATE users SET id = gen_random_uuid() WHERE id IS NULL;

SELECT 'Users table fixed for NextAuth.js' as status;
