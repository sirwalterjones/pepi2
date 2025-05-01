-- This migration fixes the permissions for agents to edit their own transactions

-- First, drop the existing policy if it exists
DROP POLICY IF EXISTS "Agents can update their own transactions" ON transactions;

-- Create a new policy that allows agents to update their own transactions
CREATE POLICY "Agents can update their own transactions"
ON transactions
FOR UPDATE
USING (auth.uid() IN (
  SELECT user_id FROM agents WHERE id = agent_id
))
WITH CHECK (auth.uid() IN (
  SELECT user_id FROM agents WHERE id = agent_id
));

-- Ensure agents can update any transaction they own, regardless of status
DROP POLICY IF EXISTS "Agents can update rejected transactions" ON transactions;

-- Create a policy that allows agents to update any transaction they own
CREATE POLICY "Agents can update rejected transactions"
ON transactions
FOR UPDATE
USING (auth.uid() IN (
  SELECT user_id FROM agents WHERE id = agent_id
))
WITH CHECK (auth.uid() IN (
  SELECT user_id FROM agents WHERE id = agent_id
));
