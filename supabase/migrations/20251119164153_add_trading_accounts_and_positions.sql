/*
  # Add Trading Accounts and Positions

  1. New Tables
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
      - `type` (text, BUY or SELL)
      - `volume` (numeric)
      - `open_price` (numeric)
      - `current_price` (numeric)
      - `stop_loss` (numeric, nullable)
      - `take_profit` (numeric, nullable)
      - `open_time` (timestamp)
      - `commission` (numeric)
      - `swap` (numeric)
      - `profit` (numeric)
      - `comment` (text, nullable)
      - `magic_number` (integer)
    
    - `market_data`
      - `id` (uuid, primary key)
      - `symbol` (text)
      - `bid` (numeric)
      - `ask` (numeric)
      - `high` (numeric)
      - `low` (numeric)
      - `volume` (numeric)
      - `timestamp` (timestamp)

  2. Security
    - Enable RLS on all new tables
    - Add policies for users to access their own data
*/

-- Create trading_accounts table
CREATE TABLE IF NOT EXISTS trading_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_challenge_id uuid UNIQUE NOT NULL REFERENCES user_challenges(id) ON DELETE CASCADE,
  account_number text UNIQUE NOT NULL,
  password text NOT NULL,
  server text DEFAULT 'PropFirm-Demo-1',
  balance numeric NOT NULL,
  equity numeric NOT NULL,
  margin numeric DEFAULT 0,
  free_margin numeric NOT NULL,
  margin_level numeric DEFAULT 0,
  leverage integer DEFAULT 100,
  currency text DEFAULT 'USD',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create positions table
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
  open_time timestamptz DEFAULT now(),
  commission numeric DEFAULT 0,
  swap numeric DEFAULT 0,
  profit numeric DEFAULT 0,
  comment text,
  magic_number integer DEFAULT 0
);

-- Create market_data table
CREATE TABLE IF NOT EXISTS market_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  bid numeric NOT NULL,
  ask numeric NOT NULL,
  high numeric NOT NULL,
  low numeric NOT NULL,
  volume numeric NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trading_accounts_account_number ON trading_accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_trading_accounts_user_challenge_id ON trading_accounts(user_challenge_id);
CREATE INDEX IF NOT EXISTS idx_positions_trading_account_id ON positions(trading_account_id);
CREATE INDEX IF NOT EXISTS idx_positions_ticket ON positions(ticket);
CREATE INDEX IF NOT EXISTS idx_market_data_symbol ON market_data(symbol);
CREATE INDEX IF NOT EXISTS idx_market_data_timestamp ON market_data(timestamp);
CREATE UNIQUE INDEX IF NOT EXISTS idx_market_data_symbol_timestamp ON market_data(symbol, timestamp);

-- Enable RLS
ALTER TABLE trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trading_accounts
CREATE POLICY "Users can view own trading accounts"
  ON trading_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_challenges
      WHERE user_challenges.id = trading_accounts.user_challenge_id
      AND user_challenges.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own trading accounts"
  ON trading_accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_challenges
      WHERE user_challenges.id = trading_accounts.user_challenge_id
      AND user_challenges.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_challenges
      WHERE user_challenges.id = trading_accounts.user_challenge_id
      AND user_challenges.user_id = auth.uid()
    )
  );

-- RLS Policies for positions
CREATE POLICY "Users can view own positions"
  ON positions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trading_accounts
      JOIN user_challenges ON user_challenges.id = trading_accounts.user_challenge_id
      WHERE trading_accounts.id = positions.trading_account_id
      AND user_challenges.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own positions"
  ON positions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trading_accounts
      JOIN user_challenges ON user_challenges.id = trading_accounts.user_challenge_id
      WHERE trading_accounts.id = positions.trading_account_id
      AND user_challenges.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own positions"
  ON positions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trading_accounts
      JOIN user_challenges ON user_challenges.id = trading_accounts.user_challenge_id
      WHERE trading_accounts.id = positions.trading_account_id
      AND user_challenges.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trading_accounts
      JOIN user_challenges ON user_challenges.id = trading_accounts.user_challenge_id
      WHERE trading_accounts.id = positions.trading_account_id
      AND user_challenges.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own positions"
  ON positions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trading_accounts
      JOIN user_challenges ON user_challenges.id = trading_accounts.user_challenge_id
      WHERE trading_accounts.id = positions.trading_account_id
      AND user_challenges.user_id = auth.uid()
    )
  );

-- RLS Policies for market_data (public read for authenticated users)
CREATE POLICY "Authenticated users can view market data"
  ON market_data FOR SELECT
  TO authenticated
  USING (true);