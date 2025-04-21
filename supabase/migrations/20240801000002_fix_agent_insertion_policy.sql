-- Fix the circular dependency in agent insertion policy
-- The current policy requires a user to be an admin to add an agent,
-- but this creates a chicken-and-egg problem for the first admin

-- Drop the existing policy
DROP POLICY IF EXISTS "Agents are insertable by admins" ON agents;

-- Create a new policy that allows the first agent to be created without restrictions
-- and subsequent agents to be created by admins
CREATE POLICY "Agents are insertable by authenticated users"
  ON agents FOR INSERT
  WITH CHECK (
    -- Allow insertion if there are no agents with admin role yet (first admin)
    (NOT EXISTS (SELECT 1 FROM agents WHERE role = 'admin'))
    OR
    -- Or if the current user is an admin
    (auth.uid() IN (SELECT user_id FROM agents WHERE role = 'admin'))
  );
