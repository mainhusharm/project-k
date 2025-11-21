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

const priceCache: Record<string, { price: any; timestamp: number; basePrice: number }> = {}
const CACHE_DURATION = 1500

export async function GET(
  req: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const symbol = params.symbol.toUpperCase()
    const now = Date.now()

    if (priceCache[symbol] && now - priceCache[symbol].timestamp < CACHE_DURATION) {
      return NextResponse.json({ price: priceCache[symbol].price })
    }

    const yfinanceSymbol = SYMBOL_MAP[symbol] || `${symbol}=X`

    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yfinanceSymbol}?interval=1m&range=1d`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
          next: { revalidate: 0 },
        }
      )

      if (response.ok) {
        const data = await response.json()
        const quote = data.chart?.result?.[0]?.meta

        if (quote && quote.regularMarketPrice) {
          const price = quote.regularMarketPrice
          const spread = price * 0.0002

          const marketPrice = {
            symbol,
            bid: parseFloat((price - spread / 2).toFixed(5)),
            ask: parseFloat((price + spread / 2).toFixed(5)),
            timestamp: new Date().toISOString(),
          }

          priceCache[symbol] = { price: marketPrice, timestamp: now, basePrice: price }
          return NextResponse.json({ price: marketPrice })
        }
      }
    } catch (fetchError) {
      console.error('YFinance fetch error:', fetchError)
    }

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

    let basePrice = fallbackPrices[symbol] || 1.0

    if (priceCache[symbol]?.basePrice) {
      basePrice = priceCache[symbol].basePrice
    }

    const volatilityMultiplier = symbol.includes('BTC') || symbol.includes('ETH') ? 0.002 : 0.0008
    const trendBias = (Math.random() - 0.48)
    const variation = trendBias * basePrice * volatilityMultiplier
    const price = basePrice + variation
    const spread = price * 0.0002

    const fallbackPrice = {
      symbol,
      bid: parseFloat((price - spread / 2).toFixed(5)),
      ask: parseFloat((price + spread / 2).toFixed(5)),
      timestamp: new Date().toISOString(),
    }

    priceCache[symbol] = { price: fallbackPrice, timestamp: now, basePrice: price }
    return NextResponse.json({ price: fallbackPrice })
  } catch (error) {
    console.error('Error fetching price for', params.symbol, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
