-- Add status and review_notes fields to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Update publication for realtime
-- The transactions table is already part of the supabase_realtime publication
