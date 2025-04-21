-- Add RLS policy to ensure only admins can delete agents

-- First, enable RLS on the agents table if not already enabled
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Drop the policy if it exists to avoid errors when running the migration multiple times
DROP POLICY IF EXISTS "Only admins can delete agents" ON agents;

-- Create the policy that allows only admins to delete agents
CREATE POLICY "Only admins can delete agents"
ON agents
FOR DELETE
USING (
  -- Check if the current user has an admin role in the agents table
  EXISTS (
    SELECT 1 FROM agents
    WHERE agents.user_id = auth.uid()
    AND agents.role = 'admin'
  )
);
