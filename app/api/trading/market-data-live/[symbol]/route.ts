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

export async function GET(
  req: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const symbol = params.symbol.toUpperCase()
    const yfinanceSymbol = SYMBOL_MAP[symbol] || `${symbol}=X`

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yfinanceSymbol}?interval=1m&range=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
        next: { revalidate: 0 },
      }
    )

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`)
    }

    const data = await response.json()
    const quote = data.chart?.result?.[0]?.meta

    if (!quote || !quote.regularMarketPrice) {
      throw new Error('No price data available')
    }

    const price = quote.regularMarketPrice
    const spread = price * 0.0002

    const marketPrice = {
      symbol,
      bid: parseFloat((price - spread / 2).toFixed(5)),
      ask: parseFloat((price + spread / 2).toFixed(5)),
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json({ price: marketPrice })
  } catch (error) {
    console.error('Market data error:', error)

    const fallbackPrices: Record<string, number> = {
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

    const basePrice = fallbackPrices[params.symbol.toUpperCase()] || 1.0
    const spread = basePrice * 0.0002

    return NextResponse.json({
      price: {
        symbol: params.symbol.toUpperCase(),
        bid: parseFloat((basePrice - spread / 2).toFixed(5)),
        ask: parseFloat((basePrice + spread / 2).toFixed(5)),
        timestamp: new Date().toISOString(),
      },
    })
  }
}
