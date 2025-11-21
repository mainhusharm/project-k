# Market Data Service

Real-time market data service using yfinance for forex, stocks, and commodities.

## Setup

1. Install Python dependencies:
```bash
cd services/market-data
pip install -r requirements.txt
```

2. Run the service:
```bash
python market_data_service.py
```

## Features

- Real-time price updates every 2 seconds
- Automatic position updates and P&L calculations
- Auto-close positions on stop loss/take profit
- Supports 17+ trading instruments:
  - Forex: EUR/USD, GBP/USD, USD/JPY, etc.
  - Commodities: Gold, Silver, Oil
  - Indices: S&P 500, NASDAQ
  - Crypto: BTC/USD, ETH/USD

## Database Connection

The service connects to your Supabase database automatically using the DATABASE_URL from .env file.
