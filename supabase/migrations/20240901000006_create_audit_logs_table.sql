-- Create audit_logs table to track all system activities
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  ip_address TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable row level security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for audit_logs table - only admins can view
DROP POLICY IF EXISTS "Audit logs are viewable by admins" ON audit_logs;
CREATE POLICY "Audit logs are viewable by admins"
  ON audit_logs FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM agents WHERE role = 'admin'
  ));

-- Create policy for audit_logs table - authenticated users can insert
DROP POLICY IF EXISTS "Audit logs are insertable by authenticated users" ON audit_logs;
CREATE POLICY "Audit logs are insertable by authenticated users"
  ON audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Enable realtime for audit_logs
alter publication supabase_realtime add table audit_logs;
