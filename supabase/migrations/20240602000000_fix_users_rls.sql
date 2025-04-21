-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- Create policy to allow users to insert their own profile
CREATE POLICY "Users can insert their own profile"
ON users
FOR INSERT
WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

-- Enable realtime for users table
alter publication supabase_realtime add table users;