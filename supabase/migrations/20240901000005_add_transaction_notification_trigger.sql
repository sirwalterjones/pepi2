-- Create a function to notify on transaction status changes
CREATE OR REPLACE FUNCTION notify_transaction_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status <> OLD.status OR (NEW.status = 'pending' AND OLD.status = 'rejected')) THEN
    PERFORM pg_notify(
      'transaction_status_change',
      json_build_object(
        'id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'agent_id', NEW.agent_id,
        'pepi_book_id', NEW.pepi_book_id
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function on transaction updates
DROP TRIGGER IF EXISTS transaction_status_change_trigger ON transactions;
CREATE TRIGGER transaction_status_change_trigger
AFTER UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION notify_transaction_status_change();

-- Enable realtime for transactions table if not already enabled
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
