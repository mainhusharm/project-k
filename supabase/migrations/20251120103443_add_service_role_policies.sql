/*
  # Add Service Role Policies

  1. Changes
    - Add policies to allow service role (backend API) to bypass RLS
    - Service role can perform all operations on behalf of users
    
  2. Notes
    - Service role key should only be used server-side
    - These policies allow backend APIs to manage data securely
*/

-- Allow service role to insert users (for registration)
CREATE POLICY "Service role can insert users"
  ON users FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow service role to read all users
CREATE POLICY "Service role can read users"
  ON users FOR SELECT
  TO service_role
  USING (true);

-- Allow service role to update users
CREATE POLICY "Service role can update users"
  ON users FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow service role full access to user_challenges
CREATE POLICY "Service role can select user_challenges"
  ON user_challenges FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert user_challenges"
  ON user_challenges FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update user_challenges"
  ON user_challenges FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow service role full access to trading_accounts
CREATE POLICY "Service role can select trading_accounts"
  ON trading_accounts FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert trading_accounts"
  ON trading_accounts FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update trading_accounts"
  ON trading_accounts FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow service role full access to positions
CREATE POLICY "Service role can select positions"
  ON positions FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert positions"
  ON positions FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update positions"
  ON positions FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete positions"
  ON positions FOR DELETE
  TO service_role
  USING (true);

-- Allow service role full access to trades
CREATE POLICY "Service role can select trades"
  ON trades FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert trades"
  ON trades FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update trades"
  ON trades FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
