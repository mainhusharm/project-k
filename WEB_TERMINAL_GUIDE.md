# Web Terminal Guide

## Overview

The Web Terminal provides a professional trading interface with real-time TradingView charts and quick order execution.

## Features

### 1. TradingView Integration
- **Professional Charts**: Full TradingView widget with all features
- **Multiple Timeframes**: 1m, 5m, 15m, 30m, 1h, 4h, Daily
- **Technical Indicators**: All TradingView indicators available
- **Drawing Tools**: Trendlines, channels, Fibonacci, etc.
- **Chart Types**: Candlestick, Bar, Line, Heikin Ashi

### 2. Supported Instruments

**Cryptocurrencies:**
- BTCUSD - Bitcoin
- ETHUSD - Ethereum

**Forex:**
- EURUSD - Euro/US Dollar
- GBPUSD - British Pound/US Dollar
- USDJPY - US Dollar/Japanese Yen
- GOLD - Gold Spot

**Stocks:**
- AAPL - Apple Inc.
- TSLA - Tesla Inc.
- GOOGL - Alphabet Inc.
- MSFT - Microsoft Corp.

**Indices:**
- SPX - S&P 500

### 3. Order Panel

**Quick Buy/Sell Toggle:**
- Click BUY or SELL to select order side
- Visual feedback with color coding

**Order Parameters:**
- **Quantity**: Amount to trade (minimum 0.01)
- **Leverage**: 1x to 50x slider
- **Stop Loss**: Optional price level to limit losses
- **Take Profit**: Optional price level to secure profits

**Position Calculator:**
- Shows position value (Quantity × Price × Leverage)
- Shows margin required (Position value / Leverage)

### 4. Position Management

**Live Position Display:**
- Real-time P&L updates
- Entry price and current price
- Applied leverage
- Stop Loss and Take Profit levels
- Quick close button

**Position Info:**
- Color-coded by side (Green for BUY, Red for SELL)
- Shows unrealized profit/loss
- Updates every 3 seconds

### 5. Account Overview

**Dashboard Metrics:**
- **Balance**: Available trading capital
- **Equity**: Balance + Unrealized P&L
- **Open Positions**: Number of active trades
- **Total P&L**: Sum of all position profits/losses

## How to Use

### Opening a Position

1. **Select Symbol**: Use dropdown to choose instrument
2. **Choose Side**: Click BUY or SELL
3. **Set Quantity**: Enter trade size
4. **Adjust Leverage** (optional): Slide to desired level
5. **Set Risk Management** (optional):
   - Enter Stop Loss price
   - Enter Take Profit price
6. **Execute**: Click the execute button

### Managing Positions

**View Positions:**
- All open positions shown in bottom panel
- Live updates every 3 seconds
- P&L shown in real-time

**Close Position:**
- Click the X button on any position card
- Confirm the closure
- Position closes at current market price

### Reading the Chart

**TradingView Features:**
- Use toolbar for drawing tools
- Add indicators from top menu
- Change timeframe with buttons at bottom
- Zoom with mouse wheel or pinch gesture
- Pan by dragging chart

**Symbol Switching:**
- Use dropdown above chart
- Chart updates automatically
- Keeps your drawings and indicators

## Trading Tips

### Risk Management
1. Always set Stop Loss for protection
2. Use appropriate leverage (lower is safer)
3. Don't risk more than you can afford to lose
4. Start with small positions to test

### Position Sizing
- **Conservative**: 1-5x leverage
- **Moderate**: 5-15x leverage
- **Aggressive**: 15-50x leverage

**Margin Calculation:**
```
Margin Required = (Quantity × Price) / Leverage
```

Example:
- Quantity: 1 BTC
- Price: $50,000
- Leverage: 10x
- Margin: $50,000 / 10 = $5,000

### Using Stop Loss & Take Profit

**Stop Loss Example:**
- Entry: $50,000 (BUY)
- Stop Loss: $49,000
- Max Loss: $1,000 × Quantity × Leverage

**Take Profit Example:**
- Entry: $50,000 (BUY)
- Take Profit: $52,000
- Target Profit: $2,000 × Quantity × Leverage

## Keyboard Shortcuts (TradingView)

- **Space**: Toggle crosshair tool
- **Alt + H**: Horizontal line
- **Alt + V**: Vertical line
- **Alt + T**: Trendline
- **Ctrl + Z**: Undo
- **Ctrl + Y**: Redo
- **Esc**: Deselect tool

## Account Statistics

**Balance vs Equity:**
- Balance: Your actual account funds
- Equity: Balance + Unrealized P&L
- When position closes, profit/loss moves from Equity to Balance

**Understanding P&L:**
- **Unrealized P&L**: Profit/loss on open positions
- **Realized P&L**: Profit/loss on closed positions
- Only closed positions affect your balance

## Demo Account

The web terminal uses your demo trading account:
- Starting balance: $10,000
- Virtual trading with real market prices
- No risk to real funds
- Practice trading strategies safely

## Technical Details

**Update Frequency:**
- Position P&L: Every 3 seconds
- Account stats: Every 5 seconds
- Chart data: Real-time via TradingView

**Price Source:**
- TradingView real-time feeds
- Yahoo Finance fallback
- Multiple exchange aggregation

## Troubleshooting

**Chart not loading:**
- Check internet connection
- Refresh the page
- Try different symbol

**Position not opening:**
- Check account balance
- Verify margin requirements
- Check leverage limits

**P&L not updating:**
- Check network connection
- Positions update every 3 seconds
- Refresh if stuck

## Support

For issues or questions:
1. Check browser console for errors
2. Verify network connection
3. Try refreshing the page
4. Check account balance

## Safety Notes

⚠️ **Important:**
- This is a DEMO account with virtual funds
- Practice risk management before live trading
- High leverage increases both profits AND losses
- Market conditions can be volatile

✅ **Best Practices:**
- Start with low leverage
- Always use stop losses
- Don't overtrade
- Study before executing
- Keep positions small initially
