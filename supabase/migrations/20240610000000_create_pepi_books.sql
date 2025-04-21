-- Create PEPI Books table
CREATE TABLE IF NOT EXISTS pepi_books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER NOT NULL,
  starting_amount DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Add index on year for faster lookups
CREATE INDEX IF NOT EXISTS pepi_books_year_idx ON pepi_books(year);

-- Add index on is_active for faster filtering
CREATE INDEX IF NOT EXISTS pepi_books_is_active_idx ON pepi_books(is_active);

-- Add foreign key to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS pepi_book_id UUID REFERENCES pepi_books(id);

-- Enable realtime for pepi_books
alter publication supabase_realtime add table pepi_books;
