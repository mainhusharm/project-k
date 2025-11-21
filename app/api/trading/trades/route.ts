import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getMockTrades } from '@/lib/mock-positions'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 })
    }

    // For mock accounts, return trades from persisted file store
    if (accountId.startsWith('MOCK-')) {
      console.log('Loading trades for mock account:', accountId)

      const mockTrades = getMockTrades(accountId)
      console.log('Persisted trades:', mockTrades)

      // Format trades to match frontend expectations
      const formattedTrades = mockTrades.map(trade => ({
        id: trade.id || `trade-${Date.now()}`,
        symbol: trade.symbol,
        side: trade.type || trade.side,
        lot_size: trade.volume || trade.lot_size,
        entry_price: trade.open_price || trade.entry_price,
        exit_price: trade.close_price || trade.exit_price || trade.current_price,
        pnl: trade.profit || trade.pnl,
        pips: trade.pips || 0,
        commission: trade.commission,
        swap: trade.swap || 0,
        open_time: trade.open_time,
        close_time: trade.close_time || new Date().toISOString(),
      }))

      console.log('Returning trades:', formattedTrades)
      return NextResponse.json(formattedTrades)
    }

    // For real accounts, load closed positions from database
    const { data: positions, error } = await supabase
      .from('positions')
      .select('*')
      .eq('trading_account_id', accountId)
      .eq('status', 'closed') // Only closed positions
      .order('close_time', { ascending: false })
      .limit(50)

    if (error) {
      console.warn('No trades found for account:', accountId, error.message)
      return NextResponse.json([])
    }

    const trades = (positions || []).map(pos => ({
      id: pos.id,
      symbol: pos.symbol,
      side: pos.type,
      lot_size: pos.volume,
      entry_price: pos.open_price,
      exit_price: pos.close_price,
      pnl: pos.profit,
      pips: pos.pips || 0,
      commission: pos.commission,
      swap: pos.swap || 0,
      open_time: pos.open_time,
      close_time: pos.close_time,
    }))

    return NextResponse.json(trades)
  } catch (error) {
    console.error('Failed to get trades:', error)
    return NextResponse.json({ error: 'Failed to get trades' }, { status: 500 })
  }
}
