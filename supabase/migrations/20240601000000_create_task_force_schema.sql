-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  badge_number TEXT,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  role TEXT NOT NULL DEFAULT 'agent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('issuance', 'spending', 'return')),
  amount DECIMAL(10, 2) NOT NULL,
  receipt_number TEXT,
  description TEXT,
  agent_id UUID REFERENCES agents(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable row level security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for agents table
DROP POLICY IF EXISTS "Agents are viewable by authenticated users" ON agents;
CREATE POLICY "Agents are viewable by authenticated users"
  ON agents FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Agents are insertable by admins" ON agents;
CREATE POLICY "Agents are insertable by admins"
  ON agents FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM agents WHERE role = 'admin'
  ));

DROP POLICY IF EXISTS "Agents are updatable by admins" ON agents;
CREATE POLICY "Agents are updatable by admins"
  ON agents FOR UPDATE
  USING (auth.uid() IN (
    SELECT user_id FROM agents WHERE role = 'admin'
  ));

-- Create policies for transactions table
DROP POLICY IF EXISTS "Transactions are viewable by authenticated users" ON transactions;
CREATE POLICY "Transactions are viewable by authenticated users"
  ON transactions FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Transactions are insertable by authenticated users" ON transactions;
CREATE POLICY "Transactions are insertable by authenticated users"
  ON transactions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Transactions are updatable by admins" ON transactions;
CREATE POLICY "Transactions are updatable by admins"
  ON transactions FOR UPDATE
  USING (auth.uid() IN (
    SELECT user_id FROM agents WHERE role = 'admin'
  ));

-- Enable realtime
alter publication supabase_realtime add table agents;
alter publication supabase_realtime add table transactions;