-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('issuance', 'spending', 'return')),
  amount DECIMAL(10, 2) NOT NULL,
  receipt_number TEXT,
  description TEXT,
  agent_id UUID REFERENCES agents(id),
  pepi_book_id UUID REFERENCES pepi_books(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_notes TEXT
);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Agents can view their own transactions" ON transactions;
CREATE POLICY "Agents can view their own transactions"
  ON transactions FOR SELECT
  USING (agent_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
CREATE POLICY "Admins can view all transactions"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.user_id = auth.uid()
      AND agents.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert transactions" ON transactions;
CREATE POLICY "Admins can insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.user_id = auth.uid()
      AND agents.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Agents can insert transactions" ON transactions;
CREATE POLICY "Agents can insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can update transactions" ON transactions;
CREATE POLICY "Admins can update transactions"
  ON transactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.user_id = auth.uid()
      AND agents.role = 'admin'
    )
  );

-- Enable realtime
alter publication supabase_realtime add table transactions;
