-- Find the first user and make them an admin
DO $$
DECLARE
  first_user_id UUID;
BEGIN
  -- Get the first user from the auth.users table
  SELECT id INTO first_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  
  -- Check if we found a user
  IF first_user_id IS NOT NULL THEN
    -- Check if this user already has an agent record
    IF EXISTS (SELECT 1 FROM agents WHERE user_id = first_user_id) THEN
      -- Update the existing agent to be an admin
      UPDATE agents SET role = 'admin' WHERE user_id = first_user_id;
    ELSE
      -- Create a new agent record with admin role
      INSERT INTO agents (user_id, name, role, is_active, created_at)
      SELECT 
        first_user_id, 
        COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = first_user_id), 'Admin User'),
        'admin',
        true,
        NOW();
    END IF;
  END IF;
END $$;
