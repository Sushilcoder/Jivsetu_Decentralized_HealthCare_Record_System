-- Complete setup for doctor_accounts table with proper RLS configuration
-- This script creates the table if it doesn't exist and disables RLS

-- Create the doctor_accounts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.doctor_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  wallet_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure RLS is disabled for public signup
ALTER TABLE public.doctor_accounts DISABLE ROW LEVEL SECURITY;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_doctor_accounts_username ON public.doctor_accounts(username);
CREATE INDEX IF NOT EXISTS idx_doctor_accounts_email ON public.doctor_accounts(email);

-- Grant appropriate permissions
GRANT ALL ON public.doctor_accounts TO anon;
GRANT ALL ON public.doctor_accounts TO authenticated;
GRANT ALL ON public.doctor_accounts TO service_role;
