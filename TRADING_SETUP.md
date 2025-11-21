# Trading Platform Setup Guide

## Complete MT5-Like Trading System with Real-Time Market Data

### Features Implemented

- Real-time market data from yfinance (17+ trading instruments)
- Automatic trading account creation on challenge purchase
- MT5-style trading with proper P&L calculations
- Live price charts using Recharts
- Position management with auto-close on SL/TP
- Margin system with leverage (1:100)
- Real-time balance and equity updates
- Challenge rule evaluation (daily loss, total loss, profit target)

---

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd services/market-data
pip install -r requirements.txt
```

### 2. Configure Database Connection

Your Supabase database is already configured. The market data service will automatically connect using the DATABASE_URL.

### 3. Start the Market Data Service

```bash
cd services/market-data
python market_data_service.py
```

This service:
- Fetches real-time prices every 2 seconds from yfinance
- Updates all open positions with current P&L
- Auto-closes positions when SL/TP is hit
- Monitors challenge rules and updates status

### 4. Start the Next.js App

```bash
npm run dev
```

---

## Trading Flow

### 1. Purchase a Challenge
- User browses available challenges
- Clicks "Purchase Challenge"
- **Automatic trading account is created**
- Account credentials displayed (Account Number + Password)

### 2. Start Trading
- Navigate to Trading Platform
- View real-time prices for 17+ instruments
- See live charts with price history
- Place BUY/SELL orders with optional SL/TP
- Monitor open positions in real-time

### 3. Position Management
- Positions update automatically as prices change
- P&L calculated in real-time
- Auto-close when Stop Loss or Take Profit is hit
- Manual close available anytime

### 4. Challenge Evaluation
- System automatically checks:
  - Daily loss limit
  - Total drawdown limit
  - Profit target achievement
- Challenge status updates to PASSED/FAILED automatically
- Trading account disabled if rules breached

---

## Available Trading Instruments

### Forex (6 decimals)
- EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD
- USDCHF, NZDUSD, EURGBP, EURJPY, GBPJPY

### Commodities
- GOLD, SILVER, OIL

### Indices
- SPX500, NASDAQ

### Crypto
- BTCUSD, ETHUSD

---

## API Endpoints

### Trading Operations
- `POST /api/trading/orders` - Execute market order
- `POST /api/trading/positions/[id]/close` - Close position
- `GET /api/trading/positions` - Get all positions
- `GET /api/trading/account/[id]` - Get account details

### Market Data
- `GET /api/trading/market-data/[symbol]` - Get latest price
- `GET /api/trading/chart-data/[symbol]` - Get chart data

### Challenge Management
- `POST /api/user-challenges/purchase` - Purchase challenge (creates trading account)
- `GET /api/user-challenges` - Get user's challenges

---

## Trading Platform Features

### Dashboard
- 5 key metrics cards (Balance, Equity, Margin, Free Margin, Margin Level)
- Real-time updates every 3-5 seconds
- Color-coded margin level (green > 100%, yellow > 50%, red < 50%)

### Market Watch
- 17 trading instruments
- Live BID/ASK prices
- Click to select symbol for trading

### Price Chart
- Real-time line chart showing last 50 data points
- Auto-updates when switching symbols
- BID/ASK display below chart

### Order Entry
- Volume selection (lots)
- Optional Stop Loss
- Optional Take Profit
- One-click BUY/SELL buttons

### Position Table
- Ticket number
- Symbol, Type (BUY/SELL)
- Volume, Open Price, Current Price
- Real-time P&L (green/red)
- SL/TP display
- Close button

---

## P&L Calculation

```typescript
multiplier = type === 'BUY' ? 1 : -1
priceDiff = currentPrice - openPrice
contractSize = 100,000 (for forex)
profit = priceDiff * multiplier * volume * contractSize
netPnL = profit - commission - swap
```

### Example:
- BUY 0.01 lots EUR/USD at 1.08500
- Close at 1.08600
- Profit = (1.08600 - 1.08500) * 1 * 0.01 * 100,000 = $10

---

## Margin Calculation

```typescript
requiredMargin = (volume * contractSize * price) / leverage
```

### Example:
- Volume: 0.01 lots
- Price: 1.08500
- Leverage: 1:100
- Required Margin = (0.01 * 100,000 * 1.08500) / 100 = $10.85

---

## Challenge Rules Enforcement

### Daily Loss Check
- Calculates total P&L of trades closed today
- If dailyPnL <= -maxDailyLoss → Challenge FAILED

### Total Drawdown Check
- Monitors account balance vs initial balance
- If (initialBalance - currentBalance) >= maxTotalLoss → Challenge FAILED

### Profit Target Check
- If (currentBalance - initialBalance) >= profitTarget → Challenge PASSED

### Stop Out
- If Margin Level < 50% → All positions force-closed

---

## Testing the System

### 1. Register and Login
```
Email: test@example.com
Password: test123
```

### 2. Purchase a Challenge
- Select "25K Challenge" ($199)
- Trading account automatically created
- Note down account number and password

### 3. Execute a Trade
- Navigate to Trading Platform
- Select EUR/USD
- Enter 0.01 lots
- Click BUY
- Watch real-time P&L update

### 4. Close Position
- Click "Close" button in position table
- Profit/loss added to balance
- Trade recorded in history

---

## Market Data Service Details

### Data Sources (yfinance)
- **Forex**: `EURUSD=X`, `GBPUSD=X`, etc.
- **Gold**: `GC=F` (Gold Futures)
- **Silver**: `SI=F` (Silver Futures)
- **Oil**: `CL=F` (Crude Oil)
- **SPX500**: `^GSPC`
- **NASDAQ**: `^IXIC`
- **Bitcoin**: `BTC-USD`
- **Ethereum**: `ETH-USD`

### Update Frequency
- Price fetch: Every 2 seconds
- Position update: On every price fetch
- Chart data: Last 50 data points

### Fallback Prices
If yfinance fails, system uses cached/default prices to ensure platform never stops working.

---

## Production Deployment

### 1. Deploy Next.js to Vercel
```bash
vercel deploy
```

### 2. Deploy Market Data Service
Options:
- **AWS EC2**: Run Python script 24/7
- **DigitalOcean Droplet**: $5/month basic server
- **Heroku**: Python worker dyno
- **Railway**: Python service

### 3. Environment Variables
Add to Vercel:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
JWT_SECRET=...
```

### 4. Database Connection
Market data service connects via Supabase PostgreSQL connection string.

---

## Advanced Features (Optional)

### 1. WebSocket Integration
Add real-time updates without polling:
```bash
npm install socket.io socket.io-client
```

### 2. Email Notifications
Send account credentials via email:
```bash
npm install nodemailer
```

### 3. Mobile App
Build React Native app for iOS/Android trading.

### 4. Admin Dashboard
- Monitor all users
- View all open positions
- Manage challenges
- Process payouts

---

## Troubleshooting

### Market Data Service Not Connecting
- Check DATABASE_URL in .env
- Verify Python dependencies installed
- Check Supabase connection string

### Prices Not Updating
- Restart market data service
- Check yfinance is accessible
- Verify market_data table has recent entries

### Positions Not Closing
- Check stop loss/take profit logic
- Verify market data service is running
- Check position updates in database

### Build Errors
- Run `npm install` to ensure all dependencies
- Check TypeScript errors with `npm run typecheck`
- Verify all API routes exist

---

## System Architecture

```
┌─────────────────┐
│   Next.js App   │
│   (Frontend)    │
└────────┬────────┘
         │
         ├─── API Routes ───┐
         │                  │
         v                  v
┌─────────────────┐   ┌──────────────┐
│   Supabase DB   │   │   Python     │
│   PostgreSQL    │◄──┤   Market     │
└─────────────────┘   │   Data       │
                      │   Service    │
                      └──────────────┘
                            │
                            v
                      ┌──────────────┐
                      │   yfinance   │
                      │   (Yahoo)    │
                      └──────────────┘
```

---

## Success Criteria

✅ User can register and login
✅ User can purchase challenge
✅ Trading account auto-created with credentials
✅ Real-time prices from yfinance
✅ Charts display price history
✅ User can place BUY/SELL orders
✅ P&L calculated correctly
✅ Positions update in real-time
✅ Stop Loss/Take Profit auto-close works
✅ Challenge rules enforced automatically
✅ Account status updates (PASSED/FAILED)

---

## Support

For issues or questions:
1. Check logs in market data service
2. Verify database connections
3. Test API endpoints manually
4. Review browser console for errors

The platform is now a fully functional MT5-like trading system with real market data!
