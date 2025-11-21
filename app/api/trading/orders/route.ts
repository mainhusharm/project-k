import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addMockPosition } from '@/lib/mock-positions'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getCurrentPrice(symbol: string) {
  try {
    // Use absolute URL for internal API calls on server
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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { accountId, symbol, type, volume, stopLoss, takeProfit } = body

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 })
    }

    const priceData = await getCurrentPrice(symbol)
    if (!priceData) {
      return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 })
    }

    const openPrice = type === 'BUY' ? priceData.ask : priceData.bid

    const timestamp = Date.now()
    const ticket = `T${timestamp.toString().slice(-8)}`

    // Handle mock accounts (from immediate fallback) - Store in database for demo persistence
    if (accountId.startsWith('MOCK-')) {
      console.log('Creating position for mock account:', accountId)

      // Create mock position data
      const mockPosition = {
        id: `mock-${timestamp}`,
        ticket,
        symbol,
        type,
        volume,
        open_price: openPrice,
        current_price: openPrice,
        stop_loss: stopLoss || null,
        take_profit: takeProfit || null,
        commission: volume * 7,
        swap: 0,
        profit: 0,
        pips: 0,
        open_time: new Date().toISOString(),
      }

      // Store the mock position in the shared in-memory store
      addMockPosition(accountId, mockPosition)

      // Also create a database entry for mock positions to persist across restarts
      try {
        const position = {
          trading_account_id: accountId,
          ticket,
          symbol,
          type,
          volume,
          open_price: openPrice,
          current_price: openPrice,
          stop_loss: stopLoss || null,
          take_profit: takeProfit || null,
          commission: volume * 7,
          swap: 0,
          profit: 0,
          pips: 0,
          open_time: new Date().toISOString(),
        }

        await supabase
          .from('positions')
          .insert([position])
      } catch (dbError) {
        console.warn('Failed to create demo position in database:', dbError)
        // Continue with in-memory position
      }

      return NextResponse.json({ position: mockPosition })
    }

    // Real database operations for actual accounts
    const position = {
      trading_account_id: accountId,
      ticket,
      symbol,
      type,
      volume,
      open_price: openPrice,
      current_price: openPrice,
      stop_loss: stopLoss || null,
      take_profit: takeProfit || null,
      commission: volume * 7,
      swap: 0,
      profit: 0,
      pips: 0,
      open_time: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('positions')
      .insert([position])
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ position: data })
  } catch (error) {
    console.error('Order execution error:', error)
    return NextResponse.json({ error: 'Failed to execute order' }, { status: 500 })
  }
}
