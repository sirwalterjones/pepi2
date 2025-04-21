-- Fix agent permissions to allow all necessary operations

-- First, ensure RLS is enabled on the agents table
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to create agents" ON agents;
DROP POLICY IF EXISTS "Only admins can delete agents" ON agents;
DROP POLICY IF EXISTS "Allow authenticated users to read agents" ON agents;
DROP POLICY IF EXISTS "Allow authenticated users to update agents" ON agents;

-- Create comprehensive policies for all operations

-- 1. SELECT policy - Allow all authenticated users to read all agents
CREATE POLICY "Allow authenticated users to read agents"
ON agents
FOR SELECT
TO authenticated
USING (true);

-- 2. INSERT policy - Allow all authenticated users to create agents
CREATE POLICY "Allow authenticated users to create agents"
ON agents
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. UPDATE policy - Allow admins to update any agent, and users to update their own agent
CREATE POLICY "Allow authenticated users to update agents"
ON agents
FOR UPDATE
TO authenticated
USING (
  -- User is updating their own agent record OR user is an admin
  (auth.uid() = user_id) OR 
  EXISTS (SELECT 1 FROM agents WHERE agents.user_id = auth.uid() AND agents.role = 'admin')
);

-- 4. DELETE policy - Allow only admins to delete agents
CREATE POLICY "Only admins can delete agents"
ON agents
FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM agents WHERE agents.user_id = auth.uid() AND agents.role = 'admin')
);
