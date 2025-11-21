#!/usr/bin/env python3
"""
Real-time Market Data Service using yfinance
Fetches forex, stock, and commodity prices and updates the database
Enhanced for full MT5-like trading system
"""

import yfinance as yf
import psycopg2
from psycopg2.extras import execute_values, execute_batch
import pandas as pd
import time
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import json
import threading
import signal
import sys

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', os.getenv('NEXT_PUBLIC_SUPABASE_URL'))

SYMBOL_MAP = {
    # Major Forex Pairs
    'EURUSD': 'EURUSD=X',
    'GBPUSD': 'GBPUSD=X',
    'USDJPY': 'USDJPY=X',
    'AUDUSD': 'AUDUSD=X',
    'USDCAD': 'USDCAD=X',
    'USDCHF': 'USDCHF=X',
    'NZDUSD': 'NZDUSD=X',
    'EURGBP': 'EURGBP=X',
    'EURJPY': 'EURJPY=X',
    'GBPJPY': 'GBPJPY=X',
    'AUDJPY': 'AUDJPY=X',
    'GBPAUD': 'GBPAUD=X',
    'EURCAD': 'EURCAD=X',
    'EURAUD': 'EURAUD=X',

    # Commodities
    'GOLD': 'GC=F',
    'SILVER': 'SI=F',
    'OIL': 'CL=F',
    'COPPER': 'HG=F',
    'NATURALGAS': 'NG=F',

    # Indices
    'SPX500': '^GSPC',
    'NASDAQ': '^IXIC',
    'DJI': '^DJI',
    'FTSE100': '^FTSE',
    'DAX': '^GDAXI',
    'NIKKEI': '^N225',

    # Cryptocurrencies
    'BTCUSD': 'BTC-USD',
    'ETHUSD': 'ETH-USD',
    'BNBUSD': 'BNB-USD',
    'XRPUSD': 'XRP-USD',
    'ADAUSD': 'ADA-USD',
    'SOLUSD': 'SOL-USD',
}

DEFAULT_PRICES = {
    # Forex defaults
    'EURUSD': {'bid': 1.0850, 'ask': 1.0852, 'spread': 0.0002},
    'GBPUSD': {'bid': 1.2680, 'ask': 1.2682, 'spread': 0.0002},
    'USDJPY': {'bid': 148.45, 'ask': 148.47, 'spread': 0.02},
    'AUDUSD': {'bid': 0.6495, 'ask': 0.6497, 'spread': 0.0002},
    'USDCAD': {'bid': 1.3595, 'ask': 1.3597, 'spread': 0.0002},
    'USDCHF': {'bid': 0.8845, 'ask': 0.8847, 'spread': 0.0002},
    'NZDUSD': {'bid': 0.5845, 'ask': 0.5847, 'spread': 0.0002},
    'EURGBP': {'bid': 0.8545, 'ask': 0.8547, 'spread': 0.0002},
    'EURJPY': {'bid': 161.05, 'ask': 161.07, 'spread': 0.02},
    'GBPJPY': {'bid': 188.25, 'ask': 188.27, 'spread': 0.02},
    'AUDJPY': {'bid': 95.85, 'ask': 95.87, 'spread': 0.02},
    'GBPAUD': {'bid': 1.9525, 'ask': 1.9527, 'spread': 0.0002},
    'EURCAD': {'bid': 1.4745, 'ask': 1.4747, 'spread': 0.0002},
    'EURAUD': {'bid': 1.6725, 'ask': 1.6727, 'spread': 0.0002},

    # Commodities
    'GOLD': {'bid': 2035.50, 'ask': 2036.00, 'spread': 0.50},
    'SILVER': {'bid': 23.45, 'ask': 23.50, 'spread': 0.05},
    'OIL': {'bid': 78.25, 'ask': 78.30, 'spread': 0.05},
    'COPPER': {'bid': 3.85, 'ask': 3.90, 'spread': 0.05},
    'NATURALGAS': {'bid': 2.75, 'ask': 2.80, 'spread': 0.05},

    # Indices
    'SPX500': {'bid': 4950.00, 'ask': 4950.50, 'spread': 0.50},
    'NASDAQ': {'bid': 15550.00, 'ask': 15551.00, 'spread': 1.00},
    'DJI': {'bid': 37500.00, 'ask': 37505.00, 'spread': 5.00},
    'FTSE100': {'bid': 7680.00, 'ask': 7685.00, 'spread': 5.00},
    'DAX': {'bid': 18350.00, 'ask': 18355.00, 'spread': 5.00},
    'NIKKEI': {'bid': 33300.00, 'ask': 33310.00, 'spread': 10.00},

    # Crypto
    'BTCUSD': {'bid': 42800.00, 'ask': 42850.00, 'spread': 50.00},
    'ETHUSD': {'bid': 2250.00, 'ask': 2255.00, 'spread': 5.00},
    'BNBUSD': {'bid': 295.00, 'ask': 300.00, 'spread': 5.00},
    'XRPUSD': {'bid': 0.545, 'ask': 0.550, 'spread': 0.005},
    'ADAUSD': {'bid': 0.425, 'ask': 0.430, 'spread': 0.005},
    'SOLUSD': {'bid': 88.50, 'ask': 89.00, 'spread': 0.50},
}

class MarketDataService:
    def __init__(self):
        self.conn = None
        self.cache = {}
        self.last_update = {}
        self.running = True
        self.connect_db()
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)

    def signal_handler(self, signum, frame):
        print("\n🛑 Shutdown signal received, cleaning up...")
        self.running = False
        if self.conn:
            self.conn.close()
        sys.exit(0)

    def connect_db(self):
        try:
            db_url = DATABASE_URL.replace('https://', '').replace('.supabase.co', '')
            if '?' in db_url:
                project_id = db_url.split('?')[0]
            else:
                project_id = db_url
            project_id = project_id.replace('//', '').replace('/', '')

            conn_str = f"postgresql://postgres.{project_id}:postgres@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
            self.conn = psycopg2.connect(conn_str)
            print(f"✅ Connected to database")
        except Exception as e:
            print(f"⚠️ Database connection failed: {e}")
            print(f"Using fallback offline mode")

    def get_spread(self, symbol):
        if symbol in DEFAULT_PRICES:
            return DEFAULT_PRICES[symbol]['spread']

        # Dynamic spreads based on asset class
        if 'JPY' in symbol:
            return 0.02
        if symbol in ['GOLD', 'SILVER', 'COPPER', 'OIL', 'NATURALGAS']:
            return 0.50 if symbol == 'GOLD' else 0.05
        if 'BTC' in symbol or 'ETH' in symbol:
            return 50.00
        if symbol in ['SPX500', 'NASDAQ', 'DJI', 'FTSE100', 'DAX', 'NIKKEI']:
            return 5.00 if symbol == 'SPX500' else (10.00 if symbol == 'NIKKEI' else 5.00)
        return 0.0002

    def get_decimal_places(self, symbol):
        if 'JPY' in symbol:
            return 2
        if symbol in ['BTCUSD', 'ETHUSD', 'BNBUSD', 'ADAUSD', 'XRPUSD', 'SOLUSD']:
            return 2
        if symbol in ['GOLD', 'SILVER', 'COPPER', 'OIL', 'NATURALGAS']:
            return 2
        if symbol in ['SPX500', 'NASDAQ', 'DJI', 'FTSE100', 'DAX', 'NIKKEI']:
            return 2
        return 5

    def fetch_price(self, symbol):
        try:
            yf_symbol = SYMBOL_MAP.get(symbol)
            if not yf_symbol:
                return self.cache.get(symbol, DEFAULT_PRICES.get(symbol))

            # Skip if updated recently (within 2 seconds)
            now = time.time()
            if symbol in self.last_update and now - self.last_update[symbol] < 2:
                return self.cache.get(symbol)

            ticker = yf.Ticker(yf_symbol)
            data = ticker.history(period='1d', interval='1m')

            if data.empty:
                return self.cache.get(symbol, DEFAULT_PRICES.get(symbol))

            latest = data.iloc[-1]
            mid_price = float(latest['Close'])
            high = float(latest['High'])
            low = float(latest['Low'])
            volume = float(latest['Volume']) if 'Volume' in latest else 0

            spread = self.get_spread(symbol)
            bid = mid_price - (spread / 2)
            ask = mid_price + (spread / 2)

            decimals = self.get_decimal_places(symbol)
            price_data = {
                'bid': round(bid, decimals),
                'ask': round(ask, decimals),
                'high': round(high, decimals),
                'low': round(low, decimals),
                'volume': int(volume) if volume > 0 else 0,
                'last_update': datetime.utcnow(),
            }

            self.cache[symbol] = price_data
            self.last_update[symbol] = now

            return price_data

        except Exception as e:
            print(f"❌ Error fetching {symbol}: {e}")
            # Return cached data or fallback
            return self.cache.get(symbol, DEFAULT_PRICES.get(symbol))

    def save_to_db(self, symbol, price_data):
        if not self.conn:
            return

        try:
            cursor = self.conn.cursor()
            cursor.execute("""
                INSERT INTO market_data (symbol, bid, ask, high, low, volume, timestamp)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (symbol, timestamp) DO UPDATE SET
                bid = EXCLUDED.bid,
                ask = EXCLUDED.ask,
                high = EXCLUDED.high,
                low = EXCLUDED.low,
                volume = EXCLUDED.volume
            """, (
                symbol,
                price_data['bid'],
                price_data['ask'],
                price_data['high'],
                price_data['low'],
                price_data['volume'],
                price_data['last_update']
            ))
            self.conn.commit()
            cursor.close()
        except Exception as e:
            print(f"⚠️ Error saving {symbol} to DB: {e}")
            self.conn.rollback()

    def save_historical_data(self, symbol, historical_data):
        if not self.conn or not historical_data:
            return

        try:
            cursor = self.conn.cursor()
            execute_values(cursor, """
                INSERT INTO market_data (symbol, bid, ask, high, low, volume, timestamp)
                VALUES %s
                ON CONFLICT (symbol, timestamp) DO NOTHING
            """, [(row['symbol'], row['bid'], row['ask'], row['high'], row['low'], row['volume'], row['timestamp'])
                  for row in historical_data])
            self.conn.commit()
            cursor.close()
            print(f"📊 Saved {len(historical_data)} historical records for {symbol}")
        except Exception as e:
            print(f"⚠️ Error saving historical data for {symbol}: {e}")
            self.conn.rollback()

    def update_positions(self, symbol, bid, ask):
        if not self.conn:
            return

        try:
            cursor = self.conn.cursor()

            # Update position prices and profits
            cursor.execute("""
                UPDATE positions p
                SET
                  current_price = CASE
                    WHEN p.type = 'BUY' THEN %s
                    ELSE %s
                  END,
                  profit = CASE
                    WHEN p.type = 'BUY' THEN ((%s - open_price) * volume * %s)
                    ELSE ((open_price - %s) * volume * %s)
                  END,
                  updated_at = %s,
                  swap = CASE
                    WHEN p.type = 'BUY' THEN (0.000001 * volume * open_price)
                    ELSE (-0.000001 * volume * open_price)
                  END
                WHERE p.symbol = %s
                AND p.created_at::date = CURRENT_DATE
            """, (
                bid, ask, bid, self.get_contract_size(symbol),
                ask, self.get_contract_size(symbol),
                datetime.utcnow(), symbol
            ))

            self.conn.commit()
            cursor.close()

        except Exception as e:
            print(f"⚠️ Error updating positions for {symbol}: {e}")
            self.conn.rollback()

    def check_stop_loss_take_profit(self, symbol, bid, ask):
        if not self.conn:
            return

        try:
            cursor = self.conn.cursor()

            # Check BUY positions for SL/TP
            cursor.execute("""
                SELECT id, type, volume, open_price, stop_loss, take_profit, current_price
                FROM positions
                WHERE symbol = %s AND current_price IS NOT NULL
            """, (symbol,))

            positions = cursor.fetchall()

            for pos_id, pos_type, volume, open_price, stop_loss, take_profit, current_price in positions:
                should_close = False
                close_price = None

                if pos_type == 'BUY':
                    if stop_loss and current_price <= stop_loss:
                        should_close = True
                        close_price = stop_loss
                    elif take_profit and current_price >= take_profit:
                        should_close = True
                        close_price = take_profit
                else:  # SELL
                    if stop_loss and current_price >= stop_loss:
                        should_close = True
                        close_price = stop_loss
                    elif take_profit and current_price <= take_profit:
                        should_close = True
                        close_price = take_profit

                if should_close:
                    self.close_position(pos_id, close_price or current_price)

            self.conn.commit()
            cursor.close()

        except Exception as e:
            print(f"⚠️ Error checking SL/TP for {symbol}: {e}")
            self.conn.rollback()

    def close_position(self, position_id, close_price):
        try:
            cursor = self.conn.cursor()

            cursor.execute("""
                SELECT p.*, ta.user_challenge_id, ta.balance, c.account_size
                FROM positions p
                JOIN trading_accounts ta ON ta.id = p.trading_account_id
                JOIN user_challenges uc ON uc.trading_account_id = ta.id
                JOIN challenges c ON c.id = uc.challenge_id
                WHERE p.id = %s
            """, (position_id,))

            position = cursor.fetchone()
            if not position:
                return

            (pos_id, trading_account_id, ticket, symbol, pos_type, volume,
             open_price, current_price, stop_loss, take_profit, open_time,
             commission, swap, profit, comment, magic_number,
             user_challenge_id, balance, account_size) = position[:18]

            # Calculate P&L
            contract_size = self.get_contract_size(symbol)
            if pos_type == 'BUY':
                pnl = (close_price - open_price) * volume * contract_size - commission - swap
            else:
                pnl = (open_price - close_price) * volume * contract_size - commission - swap

            # Create trade record
            cursor.execute("""
                INSERT INTO trades (
                    user_challenge_id, symbol, side, lot_size, entry_price,
                    exit_price, pnl, commission, swap, status, open_time, close_time
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'CLOSED', %s, %s)
            """, (
                user_challenge_id, symbol, pos_type, volume, open_price,
                close_price, pnl, commission, swap,
                open_time, datetime.utcnow()
            ))

            # Update account balance
            new_balance = balance + pnl
            cursor.execute("""
                UPDATE trading_accounts
                SET balance = %s, updated_at = %s
                WHERE id = %s
            """, (new_balance, datetime.utcnow(), trading_account_id))

            # Update user challenge
            cursor.execute("""
                UPDATE user_challenges
                SET current_balance = %s, updated_at = %s
                WHERE id = %s
            """, (new_balance, datetime.utcnow(), user_challenge_id))

            # Delete position
            cursor.execute("DELETE FROM positions WHERE id = %s", (pos_id,))

            self.conn.commit()
            cursor.close()

            print(f"✅ Position {ticket} closed at {close_price:.5f}, P&L: {pnl:.2f} ({symbol})")

            # Check challenge rules
            self.evaluate_trading_rules(user_challenge_id, account_size)

        except Exception as e:
            print(f"❌ Error closing position: {e}")
            self.conn.rollback()

    def evaluate_trading_rules(self, user_challenge_id, account_size):
        try:
            cursor = self.conn.cursor()

            # Get daily trades and current balance
            cursor.execute("""
                SELECT
                  SUM(pnl) as daily_pnl,
                  COUNT(*) as trade_count,
                  CURRENT_DATE as today
                FROM trades
                WHERE user_challenge_id = %s
                  AND DATE(close_time) = CURRENT_DATE
                  AND status = 'CLOSED'
            """, (user_challenge_id,))

            daily_stats = cursor.fetchone()
            daily_pnl, trade_count, today = daily_stats

            # Get challenge rules
            cursor.execute("""
                SELECT c.max_daily_loss, c.profit_target, uc.current_balance
                FROM user_challenges uc
                JOIN challenges c ON c.id = uc.challenge_id
                WHERE uc.id = %s
            """, (user_challenge_id,))

            challenge = cursor.fetchone()
            if not challenge:
                return

            max_daily_loss, profit_target, current_balance = challenge

            # Check daily loss limit
            if max_daily_loss and daily_pnl and daily_pnl <= -max_daily_loss:
                cursor.execute("""
                    UPDATE user_challenges
                    SET status = 'FAILED', updated_at = %s
                    WHERE id = %s
                """, (datetime.utcnow(), user_challenge_id))

                # Disable trading account
                cursor.execute("""
                    UPDATE trading_accounts
                    SET is_active = false, updated_at = %s
                    WHERE user_challenge_id = %s
                """, (datetime.utcnow(), user_challenge_id))

                print(f"❌ Challenge {user_challenge_id} failed - daily loss limit exceeded")

            # Check profit target
            total_profit = current_balance - account_size
            if profit_target and total_profit >= profit_target:
                cursor.execute("""
                    UPDATE user_challenges
                    SET status = 'PASSED', updated_at = %s
                    WHERE id = %s
                """, (datetime.utcnow(), user_challenge_id))

                print(f"🎉 Challenge {user_challenge_id} passed - profit target reached!")

            self.conn.commit()
            cursor.close()

        except Exception as e:
            print(f"⚠️ Error evaluating trading rules: {e}")
            self.conn.rollback()

    def get_contract_size(self, symbol):
        if 'BTC' in symbol or 'ETH' in symbol:
            return 1
        if 'XRP' in symbol or 'ADA' in symbol:
            return 100000  # For better pricing
        if symbol in ['GOLD']:
            return 100
        if symbol in ['SILVER', 'COPPER']:
            return 5000
        if symbol in ['OIL', 'NATURALGAS']:
            return 1000
        if len(symbol) == 6:  # Forex pairs
            return 100000
        return 100  # Indices default

    def load_historical_data(self, symbol, days=30):
        try:
            yf_symbol = SYMBOL_MAP.get(symbol)
            if not yf_symbol:
                return

            print(f"📊 Loading historical data for {symbol}...")

            ticker = yf.Ticker(yf_symbol)
            data = ticker.history(period=f"{days}d", interval="1m")

            if data.empty:
                return

            historical_data = []
            for index, row in data.iterrows():
                timestamp = index.to_pydatetime()
                mid_price = float(row['Close'])
                spread = self.get_spread(symbol)
                bid = mid_price - (spread / 2)
                ask = mid_price + (spread / 2)

                decimals = self.get_decimal_places(symbol)
                historical_data.append({
                    'symbol': symbol,
                    'bid': round(bid, decimals),
                    'ask': round(ask, decimals),
                    'high': round(float(row['High']), decimals),
                    'low': round(float(row['Low']), decimals),
                    'volume': int(row['Volume']) if 'Volume' in row and not pd.isna(row['Volume']) else 0,
                    'timestamp': timestamp,
                })

            self.save_historical_data(symbol, historical_data)
            print(f"✅ Loaded {len(historical_data)} historical records for {symbol}")

        except Exception as e:
            print(f"⚠️ Error loading historical data for {symbol}: {e}")

    def run(self):
        print("🚀 MT5-Style Market Data Service Started")
        print(f"📊 Tracking {len(SYMBOL_MAP)} symbols")
        print("💡 Press Ctrl+C to stop\n")

        # Load historical data for major symbols (run once per day)
        if os.path.exists('.last_history_load'):
            with open('.last_history_load', 'r') as f:
                last_load = f.read().strip()
                if last_load != str(datetime.utcnow().date()):
                    for symbol in ['EURUSD', 'GBPUSD', 'USDJPY', 'GOLD', 'BTCUSD']:
                        self.load_historical_data(symbol, days=7)
                    with open('.last_history_load', 'w') as f:
                        f.write(str(datetime.utcnow().date()))
        else:
            for symbol in ['EURUSD', 'GBPUSD', 'USDJPY', 'GOLD', 'BTCUSD']:
                self.load_historical_data(symbol, days=7)
            with open('.last_history_load', 'w') as f:
                f.write(str(datetime.utcnow().date()))

        cycle = 0
        while self.running:
            try:
                cycle += 1
                start_time = time.time()
                print(f"\n--- Cycle {cycle} ---")

                processed_symbols = 0
                for symbol in SYMBOL_MAP.keys():
                    try:
                        price_data = self.fetch_price(symbol)
                        if price_data:
                            self.save_to_db(symbol, price_data)
                            self.update_positions(symbol, price_data['bid'], price_data['ask'])
                            self.check_stop_loss_take_profit(symbol, price_data['bid'], price_data['ask'])
                            processed_symbols += 1

                        if processed_symbols % 5 == 0:  # Progress indicator
                            print(f"Processed {processed_symbols}/{len(SYMBOL_MAP)} symbols")

                    except Exception as e:
                        print(f"⚠️ Error processing {symbol}: {e}")

                cycle_time = time.time() - start_time
                print(f"✅ Cycle {cycle} completed in {cycle_time:.2f}s")

                # Wait for next cycle (adjust based on market hours)
                sleep_time = 2 if self.is_market_open() else 5
                time.sleep(sleep_time)

            except KeyboardInterrupt:
                print("\n👋 Received stop signal, shutting down gracefully...")
                self.running = False
                break
            except Exception as e:
                print(f"❌ Error in main loop: {e}")
                time.sleep(5)

        if self.conn:
            self.conn.close()
        print("🛑 Market Data Service stopped")

    def is_market_open(self):
        now = datetime.utcnow()
        # Basic market hours check (can be enhanced)
        # Forex: 24/5, Stocks: 9:30 AM - 4:00 PM ET
        hour = now.hour
        weekday = now.weekday()  # 0=Monday, 6=Sunday

        # Forex 24/5
        if weekday < 5:  # Monday-Friday
            return True

        # Indices during US market hours (adjust for your timezone)
        if 14 <= hour <= 20 and weekday < 5:  # 9:30 AM - 4:00 PM ET in UTC
            return True

        return False

if __name__ == '__main__':
    service = MarketDataService()
    service.run()
