-- Add new columns for detailed spending transactions
ALTER TABLE public.transactions
ADD COLUMN spending_category TEXT,
ADD COLUMN case_number TEXT,
ADD COLUMN paid_to TEXT,
ADD COLUMN ecr_number TEXT,
ADD COLUMN date_to_evidence DATE;

-- Optional: Add a check constraint to limit spending_category values if desired
-- ALTER TABLE public.transactions
-- ADD CONSTRAINT transactions_spending_category_check 
-- CHECK (spending_category IN ('CI Payment', 'Evidence Purchase', 'Misc.') OR spending_category IS NULL); 