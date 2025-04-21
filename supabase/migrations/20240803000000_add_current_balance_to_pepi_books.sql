-- Add current_balance column to pepi_books table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'pepi_books'
        AND column_name = 'current_balance'
    ) THEN
        ALTER TABLE pepi_books ADD COLUMN current_balance DECIMAL(10, 2);
        
        -- Update existing records to set current_balance equal to starting_amount if null
        UPDATE pepi_books
        SET current_balance = starting_amount
        WHERE current_balance IS NULL;
    END IF;
END $$;

-- Check if the table is already in the publication before adding it
DO $$
DECLARE
    publication_tables TEXT[];
BEGIN
    SELECT array_agg(tablename) INTO publication_tables
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime';
    
    IF NOT ('pepi_books' = ANY(publication_tables)) THEN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE pepi_books';
    END IF;
END $$;
