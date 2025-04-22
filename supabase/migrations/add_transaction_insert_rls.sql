-- Enable Row Level Security if not already enabled
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users (linked to an agent) to insert transactions they create
CREATE POLICY "Allow authenticated users to insert own transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (
    -- Ensure the user creating the transaction is the one authenticated
    created_by = auth.uid()
    -- Optional: Check if the user exists in the agents table (could be added later if needed)
    -- AND EXISTS (SELECT 1 FROM public.agents WHERE user_id = auth.uid()) 
    -- Optional: Check if the pepi_book is active (might be better handled in application logic or trigger)
    -- AND EXISTS (SELECT 1 FROM public.pepi_books WHERE id = pepi_book_id AND is_active = TRUE AND is_closed = FALSE)
);

-- Grant usage on the sequence if it exists and is needed for default values (usually handled automatically)
-- GRANT USAGE, SELECT ON SEQUENCE public.transactions_id_seq TO authenticated; 