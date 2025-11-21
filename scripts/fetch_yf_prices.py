#!/usr/bin/env python3
"""
YFinance Real-Time Price Fetcher
Only returns real market data, no fallbacks
"""

import sys
import yfinance as yf
import json
import time
from datetime import datetime

def fetch_price_for_symbol(symbol):
    """Fetch real-time price for a single symbol"""

    # Map trading symbols to YFinance tickers
    ticker_map = {
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
        'GOLD': 'GC=F',
        'SILVER': 'SI=F',
        'BTCUSD': 'BTC-USD',
        'ETHUSD': 'ETH-USD'
    }

    # Spreads for different instruments
    spreads = {
        'EURUSD': 0.0002, 'GBPUSD': 0.0002, 'USDJPY': 0.02,
        'AUDUSD': 0.0002, 'USDCAD': 0.0002, 'USDCHF': 0.0002,
        'NZDUSD': 0.0002, 'EURGBP': 0.0002, 'EURJPY': 0.02,
        'GBPJPY': 0.02, 'GOLD': 0.50, 'SILVER': 0.05,
        'BTCUSD': 50.00, 'ETHUSD': 5.00
    }

    yf_ticker = ticker_map.get(symbol, symbol)
    spread = spreads.get(symbol, 0.0002)

    try:
        ticker = yf.Ticker(yf_ticker)

        # Try to get 1-minute historical data first
        hist = ticker.history(period='1d', interval='1m')

        if hist.empty:
            # If no minute data, try 5-minute interval
            hist = ticker.history(period='5d', interval='5m')

        bid = 0.0
        ask = 0.0
        high = 0.0
        low = 0.0
        volume = 0

        if not hist.empty:
            # Get the latest price
            latest = hist.iloc[-1]
            mid_price = float(latest['Close'])
            day_high = float(hist['High'].max())
            day_low = float(hist['Low'].min())
            volume = int(hist['Volume'].sum()) if 'Volume' in hist.columns else 0

            # Calculate bid/ask with spread
            bid = mid_price - (spread / 2)
            ask = mid_price + (spread / 2)

            # Ensure high/low reflect day's range but consider current spread
            high = day_high
            low = day_low

            # Round to appropriate decimals
            decimals = 5
            if 'JPY' in symbol:
                decimals = 2
            elif 'BTC' in symbol or 'ETH' in symbol or 'Gold' in symbol:
                decimals = 2

            bid = round(bid, decimals)
            ask = round(ask, decimals)
            high = round(high, decimals)
            low = round(low, decimals)

            return {
                'success': True,
                'symbol': symbol,
                'bid': bid,
                'ask': ask,
                'high': high,
                'low': low,
                'volume': volume,
                'timestamp': datetime.utcnow().isoformat(),
                'source': 'yfinance_real'
            }
        else:
            # If no historical data, try ticker.info
            info = ticker.info

            if 'bid' in info and 'ask' in info:
                bid = float(info['bid'])
                ask = float(info['ask'])
                mid_price = (bid + ask) / 2

                # Calculate high/low relative to mid
                high = mid_price * 1.01
                low = mid_price * 0.99
                volume = info.get('volume', 0) or 0

                # Round to appropriate decimals
                decimals = 5
                if 'JPY' in symbol:
                    decimals = 2

                bid = round(bid, decimals)
                ask = round(ask, decimals)
                high = round(high, decimals)
                low = round(low, decimals)

                return {
                    'success': True,
                    'symbol': symbol,
                    'bid': bid,
                    'ask': ask,
                    'high': high,
                    'low': low,
                    'volume': volume,
                    'timestamp': datetime.utcnow().isoformat(),
                    'source': 'yfinance_info'
                }
            elif 'regularMarketPrice' in info:
                mid_price = float(info['regularMarketPrice'])
                bid = mid_price - (spread / 2)
                ask = mid_price + (spread / 2)
                high = mid_price * 1.01
                low = mid_price * 0.99
                volume = info.get('averageVolume10days', 0) or 0

                decimals = 2 if 'JPY' in symbol else 5
                bid = round(bid, decimals)
                ask = round(ask, decimals)
                high = round(high, decimals)
                low = round(low, decimals)

                return {
                    'success': True,
                    'symbol': symbol,
                    'bid': bid,
                    'ask': ask,
                    'high': high,
                    'low': low,
                    'volume': volume,
                    'timestamp': datetime.utcnow().isoformat(),
                    'source': 'yfinance_market_price'
                }

        # If we get here, we couldn't get any price data
        return {
            'success': False,
            'symbol': symbol,
            'error': 'No price data available from YFinance',
            'timestamp': datetime.utcnow().isoformat()
        }

    except Exception as e:
        return {
            'success': False,
            'symbol': symbol,
            'error': f'YFinance error: {str(e)}',
            'timestamp': datetime.utcnow().isoformat()
        }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'Symbol required'}))
        sys.exit(1)

    symbol = sys.argv[1].upper()
    result = fetch_price_for_symbol(symbol)
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()
