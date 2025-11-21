/*
  # Create Users and Base Trading Tables

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `password` (text, hashed)
      - `name` (text)
      - `role` (text)
      - `kyc_status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `challenges`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `account_size` (numeric)
      - `profit_target` (numeric)
      - `max_daily_loss` (numeric)
      - `max_total_loss` (numeric)
      - `price` (numeric)
      - `duration_days` (integer)
      - `trading_days_required` (integer)
      - `is_active` (boolean)
      - `created_at` (timestamp)
    
    - `user_challenges`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `challenge_id` (uuid, foreign key)
      - `status` (text)
      - `start_date` (timestamp)
      - `end_date` (timestamp)
      - `current_balance` (numeric)
      - `high_water_mark` (numeric)
      - `created_at` (timestamp)
    
    - `trading_accounts`
      - `id` (uuid, primary key)
      - `user_challenge_id` (uuid, foreign key, unique)
      - `account_number` (text, unique)
      - `password` (text, hashed)
      - `server` (text)
      - `balance` (numeric)
      - `equity` (numeric)
      - `margin` (numeric)
      - `free_margin` (numeric)
      - `margin_level` (numeric)
      - `leverage` (integer)
      - `currency` (text)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `positions`
      - `id` (uuid, primary key)
      - `trading_account_id` (uuid, foreign key)
      - `ticket` (text, unique)
      - `symbol` (text)
      - `type` (text)
      - `volume` (numeric)
      - `open_price` (numeric)
      - `current_price` (numeric)
      - `stop_loss` (numeric, nullable)
      - `take_profit` (numeric, nullable)
      - `commission` (numeric)
      - `swap` (numeric)
      - `profit` (numeric)
      - `comment` (text, nullable)
      - `open_time` (timestamp)
      - `created_at` (timestamp)
    
    - `trades`
      - `id` (uuid, primary key)
      - `user_challenge_id` (uuid, foreign key)
      - `symbol` (text)
      - `side` (text)
      - `lot_size` (numeric)
      - `entry_price` (numeric)
      - `exit_price` (numeric, nullable)
      - `pnl` (numeric)
      - `commission` (numeric)
      - `swap` (numeric)
      - `status` (text)
      - `open_time` (timestamp)
      - `close_time` (timestamp, nullable)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'TRADER',
  kyc_status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  account_size numeric NOT NULL,
  profit_target numeric NOT NULL,
  max_daily_loss numeric NOT NULL,
  max_total_loss numeric NOT NULL,
  price numeric NOT NULL,
  duration_days integer NOT NULL,
  trading_days_required integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active challenges"
  ON challenges FOR SELECT
  TO authenticated
  USING (is_active = true);

-- User challenges table
CREATE TABLE IF NOT EXISTS user_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING',
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  current_balance numeric NOT NULL,
  high_water_mark numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own challenges"
  ON user_challenges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own challenges"
  ON user_challenges FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trading accounts table
CREATE TABLE IF NOT EXISTS trading_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_challenge_id uuid UNIQUE NOT NULL REFERENCES user_challenges(id) ON DELETE CASCADE,
  account_number text UNIQUE NOT NULL,
  password text NOT NULL,
  server text NOT NULL DEFAULT 'PropFirm-Demo-1',
  balance numeric NOT NULL DEFAULT 0,
  equity numeric NOT NULL DEFAULT 0,
  margin numeric NOT NULL DEFAULT 0,
  free_margin numeric NOT NULL DEFAULT 0,
  margin_level numeric NOT NULL DEFAULT 0,
  leverage integer NOT NULL DEFAULT 100,
  currency text NOT NULL DEFAULT 'USD',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trading_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trading accounts"
  ON trading_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_challenges uc
      WHERE uc.id = trading_accounts.user_challenge_id
      AND uc.user_id = auth.uid()
    )
  );

-- Positions table
CREATE TABLE IF NOT EXISTS positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trading_account_id uuid NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
  ticket text UNIQUE NOT NULL,
  symbol text NOT NULL,
  type text NOT NULL,
  volume numeric NOT NULL,
  open_price numeric NOT NULL,
  current_price numeric NOT NULL,
  stop_loss numeric,
  take_profit numeric,
  commission numeric NOT NULL DEFAULT 0,
  swap numeric NOT NULL DEFAULT 0,
  profit numeric NOT NULL DEFAULT 0,
  comment text,
  open_time timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own positions"
  ON positions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trading_accounts ta
      JOIN user_challenges uc ON uc.id = ta.user_challenge_id
      WHERE ta.id = positions.trading_account_id
      AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own positions"
  ON positions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trading_accounts ta
      JOIN user_challenges uc ON uc.id = ta.user_challenge_id
      WHERE ta.id = positions.trading_account_id
      AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own positions"
  ON positions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trading_accounts ta
      JOIN user_challenges uc ON uc.id = ta.user_challenge_id
      WHERE ta.id = positions.trading_account_id
      AND uc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trading_accounts ta
      JOIN user_challenges uc ON uc.id = ta.user_challenge_id
      WHERE ta.id = positions.trading_account_id
      AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own positions"
  ON positions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trading_accounts ta
      JOIN user_challenges uc ON uc.id = ta.user_challenge_id
      WHERE ta.id = positions.trading_account_id
      AND uc.user_id = auth.uid()
    )
  );

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_challenge_id uuid NOT NULL REFERENCES user_challenges(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  side text NOT NULL,
  lot_size numeric NOT NULL,
  entry_price numeric NOT NULL,
  exit_price numeric,
  pnl numeric NOT NULL DEFAULT 0,
  commission numeric NOT NULL DEFAULT 0,
  swap numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'OPEN',
  open_time timestamptz DEFAULT now(),
  close_time timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trades"
  ON trades FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_challenges uc
      WHERE uc.id = trades.user_challenge_id
      AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own trades"
  ON trades FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_challenges uc
      WHERE uc.id = trades.user_challenge_id
      AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own trades"
  ON trades FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_challenges uc
      WHERE uc.id = trades.user_challenge_id
      AND uc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_challenges uc
      WHERE uc.id = trades.user_challenge_id
      AND uc.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_challenge_id ON user_challenges(challenge_id);
CREATE INDEX IF NOT EXISTS idx_trading_accounts_account_number ON trading_accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_positions_trading_account_id ON positions(trading_account_id);
CREATE INDEX IF NOT EXISTS idx_positions_ticket ON positions(ticket);
CREATE INDEX IF NOT EXISTS idx_trades_user_challenge_id ON trades(user_challenge_id);
