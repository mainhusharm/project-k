/*
  # Allow User Registration

  1. Changes
    - Add policy to allow anyone to insert new users (for registration)
    - This is a common pattern for public registration
    
  2. Security
    - Users can only insert, not read other users' data
    - Existing SELECT policies still protect user data
*/

-- Allow anyone (including anon) to insert new users during registration
CREATE POLICY "Allow user registration"
  ON users FOR INSERT
  TO anon
  WITH CHECK (true);

-- Also allow authenticated users to insert (though they shouldn't need to)
CREATE POLICY "Allow authenticated user registration"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);
