import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getMockPositions } from '@/lib/mock-positions'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getCurrentPrice(symbol: string) {
  try {
    // Use the correct server port (3001) for internal API calls
    const baseUrl = typeof window === 'undefined' ? 'http://localhost:3001' : ''
    const res = await fetch(`${baseUrl}/api/trading/market-data/${symbol}`)
    if (!res.ok) throw new Error(`Price fetch failed: ${res.status}`)
    const data = await res.json()
    return data.price
  } catch (error) {
    console.error('Price fetch error:', error)
    return null
  }
}

function getContractSize(symbol: string): number {
  if (symbol.includes('GOLD') || symbol.includes('SILVER')) return 100
  if (symbol.includes('OIL')) return 1000
  if (symbol.includes('BTC') || symbol.includes('ETH')) return 1
  if (symbol.includes('SPX') || symbol.includes('NASDAQ')) return 50
  return 100000
}

function getPipMultiplier(symbol: string): number {
  if (symbol.includes('JPY')) return 100
  if (symbol.includes('GOLD') || symbol.includes('SILVER')) return 10
  if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('OIL')) return 1
  if (symbol.includes('SPX') || symbol.includes('NASDAQ')) return 1
  return 10000
}

function calculatePnL(position: any, currentPrice: number) {
  const closePrice = position.type === 'BUY' ? currentPrice : currentPrice
  const contractSize = getContractSize(position.symbol)

  let pnl: number
  if (position.type === 'BUY') {
    pnl = (closePrice - position.open_price) * position.volume * contractSize
  } else {
    pnl = (position.open_price - closePrice) * position.volume * contractSize
  }

  const multiplier = position.type === 'BUY' ? 1 : -1
  const priceDiff = closePrice - position.open_price
  const pipMultiplier = getPipMultiplier(position.symbol)
  const pips = parseFloat((priceDiff * multiplier * pipMultiplier).toFixed(2))

  return { pnl, pips, currentPrice: closePrice }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 })
    }

    // Handle mock accounts (from immediate fallback)
    if (accountId.startsWith('MOCK-')) {
      // Get in-memory mock positions
      const inMemoryPositions = getMockPositions(accountId)

      // Also load any persisted mock positions from database
      const { data: dbPositions, error } = await supabase
        .from('positions')
        .select('*')
        .eq('trading_account_id', accountId)
        .order('open_time', { ascending: false })

      // Combine in-memory and database positions (avoid duplicates)
      const allPositions = [...inMemoryPositions]
      if (dbPositions) {
        for (const dbPos of dbPositions) {
          if (!allPositions.find(p => p.id === dbPos.id)) {
            allPositions.push(dbPos)
          }
        }
      }

      // Update all mock positions with live prices and P&L
      const updatedMockPositions = await Promise.all(
        allPositions.map(async (position: any) => {
          const priceData = await getCurrentPrice(position.symbol)

          if (priceData) {
            const currentPrice = position.type === 'BUY' ? priceData.bid : priceData.ask
            const { pnl, pips } = calculatePnL(position, currentPrice)

            position = {
              ...position,
              current_price: currentPrice,
              profit: pnl,
              pips: pips,
            }
          }

          return position
        })
      )

      return NextResponse.json(updatedMockPositions)
    }

    const { data: positions, error } = await supabase
      .from('positions')
      .select('*')
      .eq('trading_account_id', accountId)
      .order('open_time', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const updatedPositions = await Promise.all(
      (positions || []).map(async (position) => {
        const priceData = await getCurrentPrice(position.symbol)

        if (priceData) {
          const currentPrice = position.type === 'BUY' ? priceData.bid : priceData.ask
          const { pnl, pips } = calculatePnL(position, currentPrice)

          await supabase
            .from('positions')
            .update({
              current_price: currentPrice,
              profit: pnl,
              pips: pips,
            })
            .eq('id', position.id)

          return {
            ...position,
            current_price: currentPrice,
            profit: pnl,
            pips: pips,
          }
        }

        return position
      })
    )

    return NextResponse.json(updatedPositions)
  } catch (error) {
    console.error('Positions fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch positions' },
      { status: 500 }
    )
  }
}
