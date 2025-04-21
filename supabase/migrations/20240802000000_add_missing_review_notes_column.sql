-- Add the missing review_notes column to the transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Enable realtime for the transactions table
alter publication supabase_realtime add table transactions;