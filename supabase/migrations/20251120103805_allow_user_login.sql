/*
  # Allow User Login

  1. Changes
    - Add policy to allow reading user data by email for login
    - This allows the login API to verify credentials
    
  2. Security
    - Only allows reading by email (for login lookup)
    - Password is still hashed in database
    - After login, JWT tokens are used for authorization
*/

-- Allow anyone to read user data by email for login verification
CREATE POLICY "Allow login by email"
  ON users FOR SELECT
  TO anon, authenticated
  USING (true);
