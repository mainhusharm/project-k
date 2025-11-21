import { NextRequest, NextResponse } from 'next/server'

const SYMBOL_MAP: Record<string, string> = {
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
  'OIL': 'CL=F',
  'SPX500': '^GSPC',
  'NASDAQ': '^IXIC',
  'BTCUSD': 'BTC-USD',
  'ETHUSD': 'ETH-USD',
}

const BASE_PRICES: Record<string, number> = {
  EURUSD: 1.08100,
  GBPUSD: 1.27100,
  USDJPY: 148.500,
  AUDUSD: 0.65000,
  USDCAD: 1.36000,
  USDCHF: 0.92000,
  NZDUSD: 0.59000,
  EURGBP: 0.85000,
  EURJPY: 160.120,
  GBPJPY: 188.880,
  GOLD: 2600.00,
  SILVER: 30.00,
  OIL: 75.00,
  SPX500: 5500.00,
  NASDAQ: 17000.00,
  BTCUSD: 90000.00,
  ETHUSD: 3200.00,
}

async function fetchYFinanceHistoricalData(symbol: string, timeframe: string, bars: number) {
  try {
    const yfinanceSymbol = SYMBOL_MAP[symbol] || `${symbol}=X`

    const intervalMap: Record<string, string> = {
      '1': '1m',
      '5': '5m',
      '15': '15m',
      '30': '30m',
      '60': '1h',
      '240': '1h',
      '1D': '1d',
    }

    const rangeMap: Record<string, string> = {
      '1': '1d',
      '5': '5d',
      '15': '5d',
      '30': '5d',
      '60': '1mo',
      '240': '1mo',
      '1D': '3mo',
    }

    const interval = intervalMap[timeframe] || '1m'
    const range = rangeMap[timeframe] || '1d'

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yfinanceSymbol}?interval=${interval}&range=${range}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
        next: { revalidate: 60 },
      }
    )

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`)
    }

    const data = await response.json()
    const result = data.chart?.result?.[0]

    if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
      throw new Error('No historical data available')
    }

    const timestamps = result.timestamp
    const quote = result.indicators.quote[0]

    const candlesticks = []
    const now = Math.floor(Date.now() / 1000)

    for (let i = 0; i < timestamps.length && candlesticks.length < bars; i++) {
      if (quote.open[i] && quote.high[i] && quote.low[i] && quote.close[i]) {
        // Validate timestamps - reject data from far future (Yahoo Finance bug)
        const timestamp = timestamps[i]
        if (timestamp > now + 86400) { // More than 24 hours in future
          console.warn('Rejecting future timestamp from Yahoo Finance:', timestamp)
          throw new Error('Invalid future timestamps from Yahoo Finance')
        }

        candlesticks.push({
          time: timestamps[i],
          open: parseFloat(quote.open[i].toFixed(5)),
          high: parseFloat(quote.high[i].toFixed(5)),
          low: parseFloat(quote.low[i].toFixed(5)),
          close: parseFloat(quote.close[i].toFixed(5)),
        })
      }
    }

    // Must have at least some candles (less strict for intraday)
    if (candlesticks.length < 2) {
      throw new Error('Insufficient data from Yahoo Finance')
    }

    return candlesticks
  } catch (error) {
    console.error('YFinance historical data error:', error)
    return null
  }
}

// Cache for simulated data to make it stable
const simulatedDataCache: Record<string, any[]> = {}

function generateCandlestickData(symbol: string, bars: number = 100, timeframe: string = '1') {
  const cacheKey = `${symbol}-${timeframe}-${bars}`

  if (simulatedDataCache[cacheKey]) {
    return simulatedDataCache[cacheKey]
  }

  const basePrice = BASE_PRICES[symbol] || 1.0
  const candlesticks = []
  const now = Math.floor(Date.now() / 1000)

  const intervalMap: Record<string, number> = {
    '1': 60,
    '5': 300,
    '15': 900,
    '30': 1800,
    '60': 3600,
    '240': 14400,
    '1D': 86400,
  }

  const interval = intervalMap[timeframe] || 60

  // Use seeded random for consistent historical data
  const seed = symbol.split('').reduce((a, b) => a + b.charCodeAt(0), 0) + parseInt(timeframe) + bars
  const random = seededRandom(seed)

  let currentPrice = basePrice

  for (let i = bars; i >= 0; i--) {
    const timestamp = now - (i * interval)

    const volatility = basePrice * 0.0005
    const change = (random() - 0.5) * volatility
    const open = currentPrice
    const close = currentPrice + change

    const range = Math.abs(close - open) * (0.5 + random() * 1.5)
    const high = Math.max(open, close) + range * 0.5
    const low = Math.min(open, close) - range * 0.5

    candlesticks.push({
      time: timestamp,
      open: parseFloat(open.toFixed(5)),
      high: parseFloat(high.toFixed(5)),
      low: parseFloat(low.toFixed(5)),
      close: parseFloat(close.toFixed(5)),
    })

    currentPrice = close
  }

  simulatedDataCache[cacheKey] = candlesticks
  return candlesticks
}

// Simple seeded random number generator for consistent results
function seededRandom(seed: number) {
  let x = Math.sin(seed) * 10000
  return () => {
    x = Math.sin(x) * 10000
    return x - Math.floor(x)
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const searchParams = req.nextUrl.searchParams
    const bars = parseInt(searchParams.get('bars') || '100')
    const timeframe = searchParams.get('timeframe') || '1'
    const symbol = params.symbol.toUpperCase()

    let candlestickData = await fetchYFinanceHistoricalData(symbol, timeframe, bars)

    if (!candlestickData || candlestickData.length === 0) {
      console.log(`Using fallback data for ${symbol}`)
      candlestickData = generateCandlestickData(symbol, bars, timeframe)
    }

    return NextResponse.json({
      symbol,
      candlesticks: candlestickData,
      interval: timeframe,
      timeframe,
      source: candlestickData && candlestickData.length > 0 ? 'yfinance' : 'simulated'
    })
  } catch (error) {
    console.error('Chart data error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chart data', candlesticks: [] },
      { status: 500 }
    )
  }
}
