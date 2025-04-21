-- Fix agent insertion policy to allow authenticated users to create agents

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow authenticated users to create agents" ON agents;

-- Create policy to allow authenticated users to insert agents
CREATE POLICY "Allow authenticated users to create agents"
ON agents
FOR INSERT
TO authenticated
WITH CHECK (true);
