-- Add transaction_date column to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_date DATE;

-- Enable realtime for the updated table
alter publication supabase_realtime add table transactions;