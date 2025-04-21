-- Create a function to update transaction amount with proper numeric casting
CREATE OR REPLACE FUNCTION update_transaction_amount(
  transaction_id UUID,
  new_amount NUMERIC,
  new_description TEXT,
  new_receipt_number TEXT,
  new_agent_id UUID,
  new_updated_at TIMESTAMPTZ
) RETURNS SETOF transactions AS $$
BEGIN
  RETURN QUERY
  UPDATE transactions
  SET 
    amount = new_amount,
    description = new_description,
    receipt_number = new_receipt_number,
    agent_id = new_agent_id,
    updated_at = new_updated_at
  WHERE id = transaction_id
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Realtime is already enabled for transactions table
-- No need to add it again
