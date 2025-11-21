/*
  # Prop Firm Platform Database Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `password` (text, hashed)
      - `name` (text)
      - `role` (text, ADMIN or TRADER)
      - `kyc_status` (text, PENDING, APPROVED, REJECTED)
      - `kyc_documents` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `challenges`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `price` (numeric)
      - `type` (text, ONE_STEP or TWO_STEP)
      - `account_size` (numeric)
      - `profit_target` (numeric)
      - `max_daily_loss` (numeric)
      - `max_total_loss` (numeric)
      - `trading_days` (integer)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `user_challenges`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `challenge_id` (uuid, foreign key)
      - `status` (text, PENDING, ACTIVE, PASSED, FAILED, FUNDED)
      - `start_date` (timestamp)
      - `end_date` (timestamp)
      - `current_balance` (numeric)
      - `high_water_mark` (numeric)
      - `metrics` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `trades`
      - `id` (uuid, primary key)
      - `user_challenge_id` (uuid, foreign key)
      - `symbol` (text)
      - `side` (text, BUY or SELL)
      - `lot_size` (numeric)
      - `entry_price` (numeric)
      - `exit_price` (numeric, nullable)
      - `stop_loss` (numeric, nullable)
      - `take_profit` (numeric, nullable)
      - `pnl` (numeric, nullable)
      - `commission` (numeric)
      - `swap` (numeric)
      - `status` (text, OPEN or CLOSED)
      - `open_time` (timestamp)
      - `close_time` (timestamp, nullable)
    
    - `funded_accounts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `account_size` (numeric)
      - `current_balance` (numeric)
      - `total_withdrawn` (numeric)
      - `profit_split` (integer)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `payouts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `amount` (numeric)
      - `status` (text, PENDING, APPROVED, PAID, REJECTED)
      - `payment_method` (text, nullable)
      - `payment_details` (jsonb, nullable)
      - `request_date` (timestamp)
      - `processed_date` (timestamp, nullable)
      - `notes` (text, nullable)
    
    - `transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `type` (text, CHALLENGE_PURCHASE, PAYOUT, REFUND)
      - `amount` (numeric)
      - `status` (text, PENDING, COMPLETED, FAILED)
      - `stripe_payment_id` (text, nullable)
      - `metadata` (jsonb, nullable)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Add policies for admin users to access all data
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  name text,
  role text NOT NULL DEFAULT 'TRADER',
  kyc_status text NOT NULL DEFAULT 'PENDING',
  kyc_documents jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  price numeric NOT NULL,
  type text NOT NULL,
  account_size numeric NOT NULL,
  profit_target numeric NOT NULL,
  max_daily_loss numeric NOT NULL,
  max_total_loss numeric NOT NULL,
  trading_days integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_challenges table
CREATE TABLE IF NOT EXISTS user_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING',
  start_date timestamptz,
  end_date timestamptz,
  current_balance numeric NOT NULL,
  high_water_mark numeric NOT NULL,
  metrics jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_challenge_id uuid NOT NULL REFERENCES user_challenges(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  side text NOT NULL,
  lot_size numeric NOT NULL,
  entry_price numeric NOT NULL,
  exit_price numeric,
  stop_loss numeric,
  take_profit numeric,
  pnl numeric,
  commission numeric DEFAULT 0,
  swap numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'OPEN',
  open_time timestamptz DEFAULT now(),
  close_time timestamptz
);

-- Create funded_accounts table
CREATE TABLE IF NOT EXISTS funded_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_size numeric NOT NULL,
  current_balance numeric NOT NULL,
  total_withdrawn numeric DEFAULT 0,
  profit_split integer NOT NULL,
  status text DEFAULT 'ACTIVE',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payouts table
CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  payment_method text,
  payment_details jsonb,
  request_date timestamptz DEFAULT now(),
  processed_date timestamptz,
  notes text
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  stripe_payment_id text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_challenge_id ON user_challenges(challenge_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_challenge_id ON trades(user_challenge_id);
CREATE INDEX IF NOT EXISTS idx_funded_accounts_user_id ON funded_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_user_id ON payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE funded_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for challenges (public read)
CREATE POLICY "Anyone can view active challenges"
  ON challenges FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for user_challenges
CREATE POLICY "Users can view own challenges"
  ON user_challenges FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own challenges"
  ON user_challenges FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own challenges"
  ON user_challenges FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for trades
CREATE POLICY "Users can view own trades"
  ON trades FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_challenges
      WHERE user_challenges.id = trades.user_challenge_id
      AND user_challenges.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own trades"
  ON trades FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_challenges
      WHERE user_challenges.id = trades.user_challenge_id
      AND user_challenges.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own trades"
  ON trades FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_challenges
      WHERE user_challenges.id = trades.user_challenge_id
      AND user_challenges.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_challenges
      WHERE user_challenges.id = trades.user_challenge_id
      AND user_challenges.user_id = auth.uid()
    )
  );

-- RLS Policies for funded_accounts
CREATE POLICY "Users can view own funded accounts"
  ON funded_accounts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for payouts
CREATE POLICY "Users can view own payouts"
  ON payouts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can request payouts"
  ON payouts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Insert sample challenges
INSERT INTO challenges (name, description, price, type, account_size, profit_target, max_daily_loss, max_total_loss, trading_days, is_active)
VALUES
  ('10K Challenge', 'One-step evaluation with $10,000 account', 99, 'ONE_STEP', 10000, 1000, 500, 1000, 5, true),
  ('25K Challenge', 'One-step evaluation with $25,000 account', 199, 'ONE_STEP', 25000, 2500, 1250, 2500, 5, true),
  ('50K Challenge', 'Two-step evaluation with $50,000 account', 299, 'TWO_STEP', 50000, 4000, 2500, 5000, 10, true),
  ('100K Challenge', 'Two-step evaluation with $100,000 account', 499, 'TWO_STEP', 100000, 8000, 5000, 10000, 10, true)
ON CONFLICT DO NOTHING;