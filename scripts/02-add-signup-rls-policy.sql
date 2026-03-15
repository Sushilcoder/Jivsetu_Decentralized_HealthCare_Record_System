-- Add INSERT policy for public signup (unauthenticated users can create accounts)
CREATE POLICY "Allow public signup" ON public.doctor_accounts
FOR INSERT
WITH CHECK (true);

-- Keep existing SELECT policy for authenticated users reading their own data
-- Keep existing UPDATE policy for authenticated users updating their own data
