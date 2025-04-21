-- Check if status column exists in transactions table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'transactions'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
