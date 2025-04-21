-- Allow agents to update their own transactions
DROP POLICY IF EXISTS "Agents can update their own transactions" ON transactions;
CREATE POLICY "Agents can update their own transactions"
  ON transactions
  FOR UPDATE
  USING (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()))
  WITH CHECK (agent_id = (SELECT id FROM agents WHERE user_id = auth.uid()));
