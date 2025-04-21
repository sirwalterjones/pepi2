-- Check if review_notes column exists in transactions table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'transactions'
        AND column_name = 'review_notes'
    ) THEN
        ALTER TABLE transactions ADD COLUMN review_notes TEXT;
    END IF;
END $$;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
