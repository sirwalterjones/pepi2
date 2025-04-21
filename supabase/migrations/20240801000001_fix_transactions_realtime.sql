-- This migration fixes the issue with the transactions table already being a member of supabase_realtime
-- Instead of trying to add it again, we'll check if it exists first

DO $$
BEGIN
  -- Check if the transactions table is already a member of supabase_realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'transactions'
  ) THEN
    -- Only add it if it's not already a member
    ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
  END IF;
END
$$;
