-- Disable RLS on doctor_accounts table to allow public signup
-- This table will be secured at the application level instead
ALTER TABLE public.doctor_accounts DISABLE ROW LEVEL SECURITY;
