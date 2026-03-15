-- Create doctor_accounts table for persistent storage
CREATE TABLE IF NOT EXISTS doctor_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  doctor_name VARCHAR(255),
  email VARCHAR(255),
  wallet_address VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_doctor_accounts_username ON doctor_accounts(username);

-- Enable RLS
ALTER TABLE doctor_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow authenticated users to read their own account
CREATE POLICY "Allow users to read own account" ON doctor_accounts
  FOR SELECT USING (true);

-- Create RLS policy to allow users to update their own account
CREATE POLICY "Allow users to update own account" ON doctor_accounts
  FOR UPDATE USING (true);
