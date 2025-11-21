import { supabase } from './supabase'

export interface TradeData {
  symbol: string
  type: 'BUY' | 'SELL'
  volume: number
  stopLoss?: number
  takeProfit?: number
  comment?: string
}

export class TradingEngine {
  static async executeMarketOrder(
    tradingAccountId: string,
    data: TradeData
  ) {
    const { data: account } = await supabase
      .from('trading_accounts')
      .select('*')
      .eq('id', tradingAccountId)
      .maybeSingle()

    if (!account || !account.is_active) {
      throw new Error('Trading account not active')
    }

    const marketData = await this.getMarketPrice(data.symbol)
    const openPrice = data.type === 'BUY' ? marketData.ask : marketData.bid

    const requiredMargin = this.calculateRequiredMargin(
      data.volume,
      openPrice,
      account.leverage
    )

    if (account.free_margin < requiredMargin) {
      throw new Error('Not enough margin available')
    }

    const ticket = this.generateTicket()

    const { data: position, error } = await supabase
      .from('positions')
      .insert({
        trading_account_id: tradingAccountId,
        ticket,
        symbol: data.symbol,
        type: data.type,
        volume: data.volume,
        open_price: openPrice,
        current_price: openPrice,
        stop_loss: data.stopLoss,
        take_profit: data.takeProfit,
        comment: data.comment,
      })
      .select()
      .single()

    if (error) throw error

    await this.updateAccountMetrics(tradingAccountId)

    return position
  }

  static async closePosition(positionId: string, closePrice?: number) {
    const { data: position } = await supabase
      .from('positions')
      .select('*, trading_account:trading_accounts(*)')
      .eq('id', positionId)
      .maybeSingle()

    if (!position) {
      throw new Error('Position not found')
    }

    const marketData = await this.getMarketPrice(position.symbol)
    const finalClosePrice = closePrice ||
      (position.type === 'BUY' ? marketData.bid : marketData.ask)

    const profit = this.calculateProfit(
      position.type,
      position.volume,
      position.open_price,
      finalClosePrice,
      position.symbol
    )

    const account = position.trading_account as any

    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .insert({
        user_challenge_id: account.user_challenge_id,
        symbol: position.symbol,
        side: position.type,
        lot_size: position.volume,
        entry_price: position.open_price,
        exit_price: finalClosePrice,
        pnl: profit - position.commission - position.swap,
        commission: position.commission,
        swap: position.swap,
        status: 'CLOSED',
        open_time: position.open_time,
        close_time: new Date().toISOString(),
      })
      .select()
      .single()

    if (tradeError) throw tradeError

    await supabase.from('positions').delete().eq('id', positionId)

    await this.updateAccountBalance(
      position.trading_account_id,
      profit - position.commission - position.swap
    )

    await this.updateAccountMetrics(position.trading_account_id)

    await this.evaluateChallengeRules(account.user_challenge_id)

    return trade
  }

  static calculateProfit(
    type: 'BUY' | 'SELL',
    volume: number,
    openPrice: number,
    closePrice: number,
    symbol: string
  ): number {
    const multiplier = type === 'BUY' ? 1 : -1
    const priceDiff = closePrice - openPrice

    const contractSize = this.getContractSize(symbol)

    return priceDiff * multiplier * volume * contractSize
  }

  static calculateRequiredMargin(
    volume: number,
    price: number,
    leverage: number
  ): number {
    const contractSize = 100000
    return (volume * contractSize * price) / leverage
  }

  static getContractSize(symbol: string): number {
    if (symbol.length === 6) return 100000
    if (symbol.includes('GOLD') || symbol.includes('SILVER')) return 100
    if (symbol.includes('OIL')) return 1000
    if (symbol.includes('BTC') || symbol.includes('ETH')) return 1
    return 100000
  }

  static async updateAccountMetrics(tradingAccountId: string) {
    const { data: account } = await supabase
      .from('trading_accounts')
      .select('*, positions(*)')
      .eq('id', tradingAccountId)
      .maybeSingle()

    if (!account) return

    const positions = (account.positions as any[]) || []

    const floatingPnL = positions.reduce(
      (sum, pos) => sum + pos.profit - pos.commission - pos.swap,
      0
    )

    const equity = account.balance + floatingPnL

    const usedMargin = positions.reduce((sum, pos) => {
      return sum + this.calculateRequiredMargin(
        pos.volume,
        pos.open_price,
        account.leverage
      )
    }, 0)

    const freeMargin = equity - usedMargin

    const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : 0

    await supabase
      .from('trading_accounts')
      .update({
        equity,
        margin: usedMargin,
        free_margin: freeMargin,
        margin_level: marginLevel,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tradingAccountId)

    if (marginLevel < 50 && marginLevel > 0 && positions.length > 0) {
      await this.handleStopOut(tradingAccountId)
    }
  }

  static async updateAccountBalance(
    tradingAccountId: string,
    profitLoss: number
  ) {
    const { data: account } = await supabase
      .from('trading_accounts')
      .select('*')
      .eq('id', tradingAccountId)
      .maybeSingle()

    if (!account) return

    const newBalance = account.balance + profitLoss

    await supabase
      .from('trading_accounts')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tradingAccountId)

    await supabase
      .from('user_challenges')
      .update({
        current_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.user_challenge_id)
  }

  static async handleStopOut(tradingAccountId: string) {
    console.log('Stop out triggered for account:', tradingAccountId)

    const { data: positions } = await supabase
      .from('positions')
      .select('*')
      .eq('trading_account_id', tradingAccountId)

    if (positions) {
      for (const position of positions) {
        await this.closePosition(position.id)
      }
    }
  }

  static async getMarketPrice(symbol: string) {
    const { data: latestData } = await supabase
      .from('market_data')
      .select('*')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!latestData) {
      return { bid: 1.1000, ask: 1.1002 }
    }

    return { bid: latestData.bid, ask: latestData.ask }
  }

  static async evaluateChallengeRules(userChallengeId: string) {
    const { data: userChallenge } = await supabase
      .from('user_challenges')
      .select(`
        *,
        challenge:challenges(*),
        trades(*),
        trading_account:trading_accounts(*)
      `)
      .eq('id', userChallengeId)
      .maybeSingle()

    if (!userChallenge || !userChallenge.trading_account) return

    const challenge = userChallenge.challenge as any
    const tradingAccount = Array.isArray(userChallenge.trading_account)
      ? userChallenge.trading_account[0]
      : userChallenge.trading_account
    const initialBalance = challenge.account_size

    const totalDrawdown = initialBalance - tradingAccount.balance
    const profit = tradingAccount.balance - initialBalance

    if (totalDrawdown >= challenge.max_total_loss) {
      await supabase
        .from('user_challenges')
        .update({ status: 'FAILED', updated_at: new Date().toISOString() })
        .eq('id', userChallengeId)

      await supabase
        .from('trading_accounts')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', tradingAccount.id)
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

    const trades = (userChallenge.trades as any[]) || []
    const todayTrades = trades.filter((t: any) => {
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

      await supabase
        .from('trading_accounts')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', tradingAccount.id)
    }
  }

  static generateTicket(): string {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
    return `${timestamp}${random}`
  }
}
