#!/usr/bin/env python3
"""
Live Price Server using YFinance for real-time market data
Provides real-time Forex, Commodities, and Crypto prices
"""

import yfinance as yf
import json
import time
from datetime import datetime
import threading
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler

class PriceHandler(BaseHTTPRequestHandler):
    def __init__(self, price_service, *args, **kwargs):
        self.price_service = price_service
        super().__init__(*args, **kwargs)

    def do_GET(self):
        try:
            # Handle CORS
            self.send_cors_headers()

            if self.path.startswith('/api/prices'):
                # Extract symbol from query
                symbol = self.get_symbol_from_path()
                if symbol:
                    price_data = self.price_service.get_price(symbol)
                    if price_data:
                        response = {
                            'symbol': symbol,
                            'bid': price_data['bid'],
                            'ask': price_data['ask'],
                            'high': price_data['high'],
                            'low': price_data['low'],
                            'timestamp': price_data['timestamp'].isoformat(),
                            'volume': price_data.get('volume', 0),
                            'last_update': datetime.utcnow().isoformat()
                        }
                        self.send_json_response(response)
                    else:
                        self.send_error_response("Symbol not found", 404)
                else:
                    # Return all symbols
                    all_prices = self.price_service.get_all_prices()
                    all_response = {
                        'prices': all_prices,
                        'timestamp': datetime.utcnow().isoformat()
                    }
                    self.send_json_response(all_response)
            elif self.path == '/health':
                self.send_json_response({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})
            else:
                self.send_error_response("Endpoint not found", 404)

        except Exception as e:
            print(f"Error handling request: {e}")
            self.send_error_response("Internal server error", 500)

    def do_OPTIONS(self):
        self.send_cors_headers()
        self.end_headers()

    def send_cors_headers(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Type', 'application/json')

    def send_json_response(self, data):
        response = json.dumps(data).encode('utf-8')
        self.send_header('Content-Length', str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def send_error_response(self, message, status_code=400):
        error_data = {'error': message, 'timestamp': datetime.utcnow().isoformat()}
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        response = json.dumps(error_data).encode('utf-8')
        self.send_header('Content-Length', str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def get_symbol_from_path(self):
        """Extract symbol from URL path like /api/prices/EURUSD"""
        parts = self.path.split('/')
        if len(parts) >= 4 and parts[1] == 'api' and parts[2] == 'prices':
            return parts[3].upper()
        return None


class YFinancePriceService:
    def __init__(self):
        # Map symbols to YFinance tickers
        self.symbol_map = {
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
            'EURCAD': 'EURCAD=X',
            'GBPAUD': 'GBPAUD=X',
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
            # Crypto
            'BTCUSD': 'BTC-USD',
            'ETHUSD': 'ETH-USD',
            'BNBUSD': 'BNB-USD',
            'XRPUSD': 'XRP-USD',
            'ADAUSD': 'ADA-USD'
        }

        # Spreads for different symbol types
        self.spreads = {
            'EURUSD': 0.0002, 'GBPUSD': 0.0002, 'USDJPY': 0.02,
            'AUDUSD': 0.0002, 'USDCAD': 0.0002, 'USDCHF': 0.0002,
            'NZDUSD': 0.0002, 'EURGBP': 0.0002, 'EURJPY': 0.02,
            'GBPJPY': 0.02, 'AUDJPY': 0.02, 'EURCAD': 0.0002,
            'GBPAUD': 0.0002, 'EURAUD': 0.0002,
            'GOLD': 0.50, 'SILVER': 0.05, 'OIL': 0.05, 'COPPER': 0.05, 'NATURALGAS': 0.05,
            'SPX500': 0.50, 'NASDAQ': 1.00, 'DJI': 5.00, 'FTSE100': 5.00, 'DAX': 5.00, 'NIKKEI': 10.00,
            'BTCUSD': 50.00, 'ETHUSD': 5.00, 'BNBUSD': 5.00, 'XRPUSD': 0.005, 'ADAUSD': 0.005
        }

        self.price_cache = {}
        self.last_update = {}
        self.decimal_places = {
            'BTCUSD': 2, 'ETHUSD': 2, 'BNBUSD': 2, 'ADAUSD': 2, 'XRPUSD': 4,
            'USDJPY': 2, 'EURJPY': 2, 'GBPJPY': 2, 'AUDJPY': 2, 'GOLD': 2,
            'SILVER': 2, 'OIL': 2, 'SPX500': 2, 'NASDAQ': 2
        }

    def get_price(self, symbol):
        """Get real-time price for a symbol"""
        try:
            if symbol not in self.symbol_map:
                print(f"Symbol {symbol} not supported")
                return None

            yf_symbol = self.symbol_map[symbol]
            spread = self.spreads[symbol]

            # Check if we have cached data (within 5 seconds)
            now = time.time()
            if symbol in self.last_update and now - self.last_update[symbol] < 5:
                return self.price_cache[symbol]

            try:
                # Fetch data from YFinance
                ticker = yf.Ticker(yf_symbol)
                data = ticker.history(period='1d', interval='1m')

                if data.empty:
                    # If no data, try a different interval
                    data = ticker.history(period='5d', interval='5m')

                if data.empty:
                    # Fallback to basic info
                    try:
                        info = ticker.info
                        if 'bid' in info and 'ask' in info:
                            mid_price = (info['bid'] + info['ask']) / 2
                        elif 'currentPrice' in info:
                            mid_price = info['currentPrice']
                        elif 'regularMarketPrice' in info:
                            mid_price = info['regularMarketPrice']
                        else:
                            print(f"No price data available for {symbol}")
                            return None

                        bid = mid_price - spread / 2
                        ask = mid_price + spread / 2

                    except Exception as e:
                        print(f"Error getting info for {symbol}: {e}")
                        return None
                else:
                    # Get latest price from historical data
                    latest = data.iloc[-1]
                    mid_price = float(latest['Close'])

                    bid = mid_price - spread / 2
                    ask = mid_price + spread / 2

                # Round to appropriate decimal places
                decimals = self.decimal_places.get(symbol, 5)
                bid = round(bid, decimals)
                ask = round(ask, decimals)

                # Calculate high/low for the day
                if not data.empty:
                    day_high = float(data['High'].max())
                    day_low = float(data['Low'].min())
                    volume = int(data['Volume'].sum()) if 'Volume' in data.columns else 0
                else:
                    day_high = ask
                    day_low = bid
                    volume = 0

                price_data = {
                    'bid': bid,
                    'ask': ask,
                    'high': day_high,
                    'low': day_low,
                    'volume': volume,
                    'timestamp': datetime.utcnow()
                }

                # Cache the result
                self.price_cache[symbol] = price_data
                self.last_update[symbol] = now

                print(f"✅ Updated {symbol}: {bid:.5f}/{ask:.5f} ({volume} vol)")
                return price_data

            except Exception as e:
                print(f"❌ Error fetching {symbol} from YFinance: {e}")

                # Return fallback price if available
                if symbol in self.price_cache:
                    return self.price_cache[symbol]
                return None

        except Exception as e:
            print(f"❌ Error in get_price for {symbol}: {e}")
            return None

    def get_all_prices(self):
        """Get prices for all supported symbols"""
        all_prices = {}
        for symbol in self.symbol_map.keys():
            price = self.get_price(symbol)
            if price:
                all_prices[symbol] = {
                    'symbol': symbol,
                    **price,
                    'timestamp': price['timestamp'].isoformat()
                }
        return all_prices

def run_server():
    price_service = YFinancePriceService()
    port = 8888

    # Create handler factory
    def handler_factory():
        return lambda *args: PriceHandler(price_service, *args)

    server_address = ('', port)

    # Create server with counter to track handler instances
    class PriceHandlerWithService(PriceHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(price_service, *args, **kwargs)

    httpd = HTTPServer(server_address, PriceHandlerWithService)

    print("🚀 YFinance Live Price Server Starting...")
    print(f"📊 Supporting {len(price_service.symbol_map)} symbols")
    print(f"🌐 Server running on http://localhost:{port}")
    print("📡 Endpoints:")
    print(f"   GET /api/prices -> Get all prices")
    print(f"   GET /api/prices/EURUSD -> Get EURUSD price")
    print(f"   GET /health -> Health check")
    print("🛑 Press Ctrl+C to stop\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
        httpd.shutdown()


if __name__ == '__main__':
    run_server()
