-- Add transaction_date column to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_date DATE;

-- Set existing transactions to use created_at date as transaction_date
UPDATE transactions SET transaction_date = created_at::date WHERE transaction_date IS NULL;

-- Add this table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
