-- Create functions for safely managing agents when there are foreign key constraints

-- Function to list all fund requests associated with an agent
CREATE OR REPLACE FUNCTION list_fund_requests_by_agent(agent_id_param UUID)
RETURNS SETOF fund_requests
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT * FROM fund_requests WHERE agent_id = agent_id_param;
$$;

-- Function to delete all fund requests for an agent
CREATE OR REPLACE FUNCTION delete_agent_fund_requests(agent_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM fund_requests WHERE agent_id = agent_id_param;
END;
$$;

-- Function to clear agent references in transactions
CREATE OR REPLACE FUNCTION clear_agent_transactions(agent_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE transactions SET agent_id = NULL WHERE agent_id = agent_id_param;
END;
$$;

-- Function to clear agent references in CI payments
CREATE OR REPLACE FUNCTION clear_agent_ci_payments(agent_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE ci_payments SET paying_agent_id = NULL WHERE paying_agent_id = agent_id_param;
END;
$$;

-- Function to delete an agent
CREATE OR REPLACE FUNCTION delete_agent(agent_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM agents WHERE id = agent_id_param;
END;
$$;

-- Function to check what constraints are still preventing agent deletion
CREATE OR REPLACE FUNCTION check_agent_constraints(agent_id_param UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb = '{}'::jsonb;
    fund_requests_count integer;
    transactions_count integer;
    ci_payments_count integer;
BEGIN
    SELECT COUNT(*) INTO fund_requests_count
    FROM fund_requests
    WHERE agent_id = agent_id_param;
    
    SELECT COUNT(*) INTO transactions_count
    FROM transactions
    WHERE agent_id = agent_id_param;
    
    SELECT COUNT(*) INTO ci_payments_count
    FROM ci_payments
    WHERE paying_agent_id = agent_id_param;
    
    result = jsonb_build_object(
        'fund_requests_count', fund_requests_count,
        'transactions_count', transactions_count,
        'ci_payments_count', ci_payments_count
    );
    
    RETURN result;
END;
$$; 