import { supabase } from './supabase'

export interface TradeData {
  symbol: string
  side: 'BUY' | 'SELL'
  lotSize: number
  entryPrice: number
  stopLoss?: number
  takeProfit?: number
}

export async function executeTrade(userChallengeId: string, data: TradeData) {
  const { data: userChallenge } = await supabase
    .from('user_challenges')
    .select('*, challenge:challenges(*)')
    .eq('id', userChallengeId)
    .maybeSingle()

  if (!userChallenge || userChallenge.status !== 'ACTIVE') {
    throw new Error('Challenge not active')
  }

  const { data: trade, error } = await supabase
    .from('trades')
    .insert({
      user_challenge_id: userChallengeId,
      symbol: data.symbol,
      side: data.side,
      lot_size: data.lotSize,
      entry_price: data.entryPrice,
      stop_loss: data.stopLoss,
      take_profit: data.takeProfit,
      status: 'OPEN',
    })
    .select()
    .single()

  if (error) throw error
  return trade
}

export async function closeTrade(tradeId: string, exitPrice: number) {
  const { data: trade } = await supabase
    .from('trades')
    .select('*, user_challenge:user_challenges(*, challenge:challenges(*))')
    .eq('id', tradeId)
    .maybeSingle()

  if (!trade || trade.status === 'CLOSED') {
    throw new Error('Trade not found or already closed')
  }

  const multiplier = trade.side === 'BUY' ? 1 : -1
  const priceDiff = exitPrice - trade.entry_price
  const pnl = priceDiff * multiplier * trade.lot_size * 100

  const { data: updatedTrade, error } = await supabase
    .from('trades')
    .update({
      exit_price: exitPrice,
      pnl,
      status: 'CLOSED',
      close_time: new Date().toISOString(),
    })
    .eq('id', tradeId)
    .select()
    .single()

  if (error) throw error

  const newBalance = (trade.user_challenge as any).current_balance + pnl
  const newHighWaterMark = Math.max(
    (trade.user_challenge as any).high_water_mark,
    newBalance
  )

  await supabase
    .from('user_challenges')
    .update({
      current_balance: newBalance,
      high_water_mark: newHighWaterMark,
      updated_at: new Date().toISOString(),
    })
    .eq('id', trade.user_challenge_id)

  await evaluateChallengeRules(trade.user_challenge_id)

  return updatedTrade
}

export async function evaluateChallengeRules(userChallengeId: string) {
  const { data: userChallenge } = await supabase
    .from('user_challenges')
    .select('*, challenge:challenges(*), trades(*)')
    .eq('id', userChallengeId)
    .maybeSingle()

  if (!userChallenge) return

  const challenge = userChallenge.challenge as any
  const currentBalance = userChallenge.current_balance
  const initialBalance = challenge.account_size

  const totalDrawdown = initialBalance - currentBalance
  const profit = currentBalance - initialBalance

  if (totalDrawdown >= challenge.max_total_loss) {
    await supabase
      .from('user_challenges')
      .update({ status: 'FAILED', updated_at: new Date().toISOString() })
      .eq('id', userChallengeId)
    return
  }

  if (profit >= challenge.profit_target) {
    await supabase
      .from('user_challenges')
      .update({ status: 'PASSED', updated_at: new Date().toISOString() })
      .eq('id', userChallengeId)
    return
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayTrades = (userChallenge.trades as any[]).filter((t: any) => {
    if (!t.close_time) return false
    const closeDate = new Date(t.close_time)
    return closeDate >= today && t.status === 'CLOSED'
  })

  const dailyPnL = todayTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0)

  if (dailyPnL <= -challenge.max_daily_loss) {
    await supabase
      .from('user_challenges')
      .update({ status: 'FAILED', updated_at: new Date().toISOString() })
      .eq('id', userChallengeId)
  }
}
