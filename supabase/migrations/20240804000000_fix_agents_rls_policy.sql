-- Drop existing policies on the agents table
DROP POLICY IF EXISTS "Agents can be inserted by authenticated users" ON agents;

-- Create a new policy that allows authenticated users to insert into agents table
CREATE POLICY "Agents can be inserted by authenticated users"
ON agents
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Ensure agents table has RLS enabled
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
