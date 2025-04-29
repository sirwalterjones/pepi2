-- Add transaction_date column to transactions table if it doesn't exist
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_date DATE;
