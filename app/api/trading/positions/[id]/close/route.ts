import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getCurrentPrice(symbol: string) {
  try {
    const res = await fetch(`http://localhost:3001/api/trading/market-data/${symbol}`)
    if (!res.ok) throw new Error('Price fetch failed')
    const data = await res.json()
    return data.price
  } catch (error) {
    console.error('Price fetch error:', error)
    return null
  }
}

function calculatePips(symbol: string, openPrice: number, closePrice: number, type: 'BUY' | 'SELL'): number {
  const multiplier = type === 'BUY' ? 1 : -1
  const priceDiff = closePrice - openPrice

  let pipMultiplier = 10000
  if (symbol.includes('JPY')) pipMultiplier = 100
  if (symbol.includes('GOLD') || symbol.includes('SILVER')) pipMultiplier = 10
  if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('OIL')) pipMultiplier = 1
  if (symbol.includes('SPX') || symbol.includes('NASDAQ')) pipMultiplier = 1

  return parseFloat((priceDiff * multiplier * pipMultiplier).toFixed(2))
}

function calculateProfit(symbol: string, type: 'BUY' | 'SELL', volume: number, openPrice: number, closePrice: number): number {
  const multiplier = type === 'BUY' ? 1 : -1
  const priceDiff = closePrice - openPrice

  let contractSize = 100000
  if (symbol.includes('GOLD') || symbol.includes('SILVER')) contractSize = 100
  if (symbol.includes('OIL')) contractSize = 1000
  if (symbol.includes('BTC') || symbol.includes('ETH')) contractSize = 1
  if (symbol.includes('SPX') || symbol.includes('NASDAQ')) contractSize = 50

  return priceDiff * multiplier * volume * contractSize
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Handle mock positions first
    if (params.id.startsWith('mock-')) {
      console.log('Closing mock position:', params.id)

      const mockLib = await import('@/lib/mock-positions')
      const { mockPositionsStore, mockTradesStore } = mockLib

      // Find the mock position across all accounts
      let position = null
      let accountId = ''

      for (const [accId, positions] of Object.entries(mockPositionsStore)) {
        const pos = positions.find((p: any) => p.id === params.id)
        if (pos) {
          position = pos
          accountId = accId
          break
        }
      }

      if (!position || !accountId) {
        return NextResponse.json({ error: 'Position not found' }, { status: 404 })
      }

      const priceData = await getCurrentPrice(position.symbol)
      if (!priceData) {
        return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 })
      }

      const closePrice = position.type === 'BUY' ? priceData.bid : priceData.ask

      const pips = calculatePips(position.symbol, position.open_price, closePrice, position.type)
      const grossProfit = calculateProfit(position.symbol, position.type, position.volume, position.open_price, closePrice)
      const netPnL = grossProfit - position.commission - position.swap

      // Close position - remove from positions store and add to trades store
      const accountPositions = mockPositionsStore[accountId] || []

      // Find the position
      const positionIndex = accountPositions.findIndex((p: any) => p.id === params.id)
      if (positionIndex === -1) {
        return NextResponse.json({ error: 'Position not found' }, { status: 404 })
      }

      // Remove from positions store
      accountPositions.splice(positionIndex, 1)

      // Create formatted trade object with calculated values
      const trade = {
        id: `trade-${Date.now()}`,
        symbol: position.symbol,
        side: position.type,
        lot_size: position.volume,
        entry_price: position.open_price,
        exit_price: closePrice,
        pnl: netPnL,
        pips,
        commission: position.commission,
        swap: position.swap,
        open_time: position.open_time,
        close_time: new Date().toISOString(),
      }

      // Add to trades store
      const accountTrades = mockTradesStore[accountId] || []
      accountTrades.push(trade)
      mockTradesStore[accountId] = accountTrades

      // Persist trades immediately
      const mockPositionsLib = await import('@/lib/mock-positions')
      const savePersistedTrades = (mockPositionsLib as any).default?.savePersistedTrades ||
                                  (() => {
                                    const fs = require('fs')
                                    fs.writeFileSync('./.mock-trades.json', JSON.stringify(mockTradesStore, null, 2))
                                    console.log('Saved persisted trades to file')
                                  })
      savePersistedTrades()

      // Persist balance for mock accounts
      const { setMockBalance, getAccumulatedBalance } = mockPositionsLib as any
      const currentBalance = getAccumulatedBalance(accountId)
      const newBalance = currentBalance + netPnL
      setMockBalance(accountId, newBalance) // Store the new absolute balance

      console.log('Mock position closed successfully in memory store')
      console.log('Closed mock position successfully:', trade)
      console.log('Balance P&L updated:', netPnL)
      return NextResponse.json({ trade })
    }

    // Handle real database positions
    const { data: position, error: fetchError } = await supabase
      .from('positions')
      .select('*')
      .eq('id', params.id)
      .eq('status', 'open')
      .single()

    if (fetchError || !position) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    }

    const priceData = await getCurrentPrice(position.symbol)
    if (!priceData) {
      return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 })
    }

    const closePrice = position.type === 'BUY' ? priceData.bid : priceData.ask

    const pips = calculatePips(position.symbol, position.open_price, closePrice, position.type)
    const grossProfit = calculateProfit(position.symbol, position.type, position.volume, position.open_price, closePrice)
    const netPnL = grossProfit - position.commission - position.swap

    const { error: updateError } = await supabase
      .from('positions')
      .update({
        status: 'closed',
        close_price: closePrice,
        close_time: new Date().toISOString(),
        profit: netPnL,
        pips: pips,
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const { data: account } = await supabase
      .from('trading_accounts')
      .select('balance')
      .eq('id', position.account_id)
      .single()

    if (account) {
      await supabase
        .from('trading_accounts')
        .update({
          balance: account.balance + netPnL,
        })
        .eq('id', position.account_id)
    }

    const trade = {
      symbol: position.symbol,
      side: position.type,
      lot_size: position.volume,
      entry_price: position.open_price,
      exit_price: closePrice,
      pnl: netPnL,
      pips,
      commission: position.commission,
      swap: position.swap,
      open_time: position.open_time,
      close_time: new Date().toISOString(),
    }

    return NextResponse.json({ trade })
  } catch (error: any) {
    console.error('Close position error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to close position' },
      { status: 400 }
    )
  }
}
