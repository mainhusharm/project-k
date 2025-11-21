'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/format'
import { ArrowUpCircle, ArrowDownCircle, RefreshCw, X } from 'lucide-react'
import { AdvancedTradingChart } from '@/components/AdvancedTradingChart'

interface Position {
  id: string
  ticket: string
  symbol: string
  type: 'BUY' | 'SELL'
  volume: number
  open_price: number
  current_price: number
  profit: number
  pips: number
  swap: number
  commission: number
  stop_loss?: number
  take_profit?: number
  open_time: string
}

interface Trade {
  id: string
  symbol: string
  side: 'BUY' | 'SELL'
  lot_size: number
  entry_price: number
  exit_price: number
  pnl: number
  pips: number
  commission: number
  open_time: string
  close_time: string
}

interface MarketPrice {
  symbol: string
  bid: number
  ask: number
  timestamp: string
}

const SYMBOLS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD',
  'USDCHF', 'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY',
  'GOLD', 'SILVER', 'OIL', 'SPX500', 'NASDAQ',
  'BTCUSD', 'ETHUSD'
]

export default function TradingPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [prices, setPrices] = useState<Record<string, MarketPrice>>({})
  const [selectedSymbol, setSelectedSymbol] = useState('EURUSD')
  const [volume, setVolume] = useState('0.01')
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [loading, setLoading] = useState(false)
  const [balance, setBalance] = useState(10000)
  const [equity, setEquity] = useState(10000)
  const [accountId, setAccountId] = useState<string>('')

  // Load initial balance from persisted storage for mock accounts
  useEffect(() => {
    if (accountId?.startsWith('MOCK-')) {
      console.log('Loading persistent balance for mock account:', accountId)
      // Load the persisted balance from server
      fetch(`/api/trading/mock-balance/${accountId}`)
        .then(res => res.json())
        .then(data => {
          console.log('Loaded persistent balance:', data.balance)
          setBalance(data.balance || 10000)
        })
        .catch(error => {
          console.log('Failed to load persistent balance, using default:', error)
          setBalance(10000)
        })
    }
  }, [accountId])

  useEffect(() => {
    initAccount()
    loadPrices()
    const interval = setInterval(() => {
      loadPrices()
      updatePositionsPrices()
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (accountId) {
      loadPositions()
      loadTrades()
      loadAccount()
      const interval = setInterval(() => {
        loadPositions()
        loadAccount()
        updatePositionsPrices()
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [accountId])

  const initAccount = async () => {
    try {
      console.log('Initializing demo account...')
      const res = await fetch('/api/demo/setup', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (data.accountId) {
          console.log('Account initialized successfully:', data.accountId)
          setAccountId(data.accountId)
        } else {
          console.error('No accountId received from setup')
          // Retry after delay
          setTimeout(() => initAccount(), 2000)
        }
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error('Failed to init account:', res.status, errorData)
        // Retry after delay
        setTimeout(() => initAccount(), 2000)
      }
    } catch (error) {
      console.error('Network error initializing account:', error)
      // Retry after delay
      setTimeout(() => initAccount(), 2000)
    }
  }

  const loadAccount = async () => {
    if (!accountId) return
    console.log('=== LOADING ACCOUNT ===')
    console.log('Current balance before loadAccount:', balance)
    try {
      const res = await fetch(`/api/trading/account/${accountId}`)
      if (res.ok) {
        const data = await res.json()
        console.log('Account API response:', data)
        // For mock accounts, don't overwrite the current balance
        if (!accountId.startsWith('MOCK-')) {
          setBalance(data.balance || 10000)
          console.log('Balance updated from account API to:', data.balance || 10000)
        } else {
          console.log('Mock account - keeping current frontend balance:', balance)
        }
      } else {
        console.log('Account API failed, keeping current balance')
      }
    } catch (error) {
      console.error('Failed to load account:', error)
      console.log('Keeping current balance due to error')
    }
    console.log('Balance after loadAccount:', balance)
    console.log('=== ACCOUNT LOAD COMPLETE ===')
  }

  const loadPrices = async () => {
    try {
      const pricePromises = SYMBOLS.map(async (symbol) => {
        const res = await fetch(`/api/trading/market-data/${symbol}`)
        const data = await res.json()
        return { symbol, price: data.price }
      })

      const results = await Promise.all(pricePromises)
      const newPrices: Record<string, MarketPrice> = {}
      results.forEach(({ symbol, price }) => {
        if (price) {
          newPrices[symbol] = price
        }
      })
      setPrices(newPrices)
    } catch (error) {
      console.error('Failed to load prices:', error)
    }
  }

  const loadPositions = async () => {
    if (!accountId) return
    try {
      const res = await fetch(`/api/trading/positions?accountId=${accountId}`)
      if (res.ok) {
        const data = await res.json()
        const positionsArray = Array.isArray(data) ? data : data.positions || []
        setPositions(positionsArray)

        const totalProfit = positionsArray.reduce((sum: number, pos: Position) => sum + (pos.profit || 0), 0)
        setEquity(balance + totalProfit)
      }
    } catch (error) {
      console.error('Failed to load positions:', error)
    }
  }

  const loadTrades = async () => {
    if (!accountId) return
    try {
      const res = await fetch(`/api/trading/trades?accountId=${accountId}`)
      if (res.ok) {
        const data = await res.json()
        setTrades(Array.isArray(data) ? data : data.trades || [])
      }
    } catch (error) {
      console.error('Failed to load trades:', error)
    }
  }

  const updatePositionsPrices = () => {
    setPositions(prevPositions =>
      prevPositions.map(pos => {
        const price = prices[pos.symbol]
        if (!price) return pos

        const current_price = pos.type === 'BUY' ? price.bid : price.ask
        const pips = calculatePips(pos.symbol, pos.open_price, current_price, pos.type)
        const profit = calculateProfit(pos.symbol, pos.type, pos.volume, pos.open_price, current_price)

        return {
          ...pos,
          current_price,
          pips,
          profit
        }
      })
    )
  }

  const calculatePips = (symbol: string, openPrice: number, closePrice: number, type: 'BUY' | 'SELL'): number => {
    const multiplier = type === 'BUY' ? 1 : -1
    const priceDiff = closePrice - openPrice

    let pipMultiplier = 10000
    if (symbol.includes('JPY')) pipMultiplier = 100
    if (symbol.includes('GOLD') || symbol.includes('SILVER')) pipMultiplier = 10
    if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('OIL')) pipMultiplier = 1
    if (symbol.includes('SPX') || symbol.includes('NASDAQ')) pipMultiplier = 1

    return parseFloat((priceDiff * multiplier * pipMultiplier).toFixed(2))
  }

  const calculateProfit = (symbol: string, type: 'BUY' | 'SELL', volume: number, openPrice: number, closePrice: number): number => {
    const multiplier = type === 'BUY' ? 1 : -1
    const priceDiff = closePrice - openPrice

    let contractSize = 100000
    if (symbol.includes('GOLD') || symbol.includes('SILVER')) contractSize = 100
    if (symbol.includes('OIL')) contractSize = 1000
    if (symbol.includes('BTC') || symbol.includes('ETH')) contractSize = 1
    if (symbol.includes('SPX') || symbol.includes('NASDAQ')) contractSize = 50

    return priceDiff * multiplier * volume * contractSize
  }

  useEffect(() => {
    const totalFloatingPnL = positions.reduce((sum, p) => sum + p.profit - p.commission - p.swap, 0)
    setEquity(balance + totalFloatingPnL)
  }, [positions, balance])

  const executeTrade = async (side: 'BUY' | 'SELL') => {
    setLoading(true)
    try {
      console.log('Executing trade with accountId:', accountId)

      // Check if accountId exists before proceeding
      if (!accountId) {
        alert('Account not initialized yet. Please wait for account setup to complete.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/trading/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          symbol: selectedSymbol,
          type: side,
          volume: parseFloat(volume),
          stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
          takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
        }),
      })

      if (res.ok) {
        await loadPositions()
        setStopLoss('')
        setTakeProfit('')
      } else {
        const error = await res.json()
        console.error('Order execution failed:', error)
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Order execution error:', error)
      alert('Failed to execute order')
    } finally {
      setLoading(false)
    }
  }

  const closePosition = async (positionId: string) => {
    if (!confirm('Close this position?')) return

    console.log('=== STARTING POSITION CLOSE ===')
    console.log('Current balance before close:', balance)

    try {
      console.log('Closing position:', positionId)
      const res = await fetch(`/api/trading/positions/${positionId}/close`, {
        method: 'POST',
      })

      console.log('Close position response status:', res.status)

      if (res.ok) {
        const data = await res.json()
        console.log('Close position response data:', data)

        if (data.trade && data.trade.pnl !== undefined) {
          console.log('Updating balance with P&L:', data.trade.pnl)
          const pnlAmount = data.trade.pnl
          console.log('Previous balance:', balance)
          const newBalance = balance + pnlAmount
          console.log('Calculated new balance:', newBalance)

          // Update balance state
          setBalance(newBalance)
          console.log('Balance state updated to:', newBalance)

          // Balance has been updated
          console.log('Balance update completed')
        } else {
          console.warn('No trade pnl received from close API')
        }

        console.log('Reloading positions and trades...')
        await loadPositions()
        await loadTrades()

        console.log('=== POSITION CLOSE COMPLETE ===')
        console.log('Final balance:', balance)
      } else {
        const error = await res.json()
        console.error('Close position error:', error)
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Close position network error:', error)
      alert('Failed to close position')
    }
  }

  const currentPrice = prices[selectedSymbol]
  const totalPnL = positions.reduce((sum, p) => sum + p.profit - p.commission - p.swap, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Trading Platform</h1>
          <p className="text-slate-600 mt-1">Demo Account</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { loadPrices(); loadPositions(); loadTrades(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(balance)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Equity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(equity)}</p>
            <p className={`text-xs mt-1 ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(0)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Free Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(equity)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Open Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{positions.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Market Watch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {SYMBOLS.map((symbol) => {
                const price = prices[symbol]
                return (
                  <button
                    key={symbol}
                    onClick={() => setSelectedSymbol(symbol)}
                    className={`flex w-full items-center justify-between rounded px-3 py-2 hover:bg-slate-100 transition ${
                      selectedSymbol === symbol ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                  >
                    <span className="font-semibold text-sm text-slate-900">{symbol}</span>
                    {price && (
                      <div className="flex gap-3 text-xs">
                        <span className="text-red-600 font-mono">{price.bid.toFixed(5)}</span>
                        <span className="text-green-600 font-mono">{price.ask.toFixed(5)}</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">{selectedSymbol} Chart</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AdvancedTradingChart
              symbol={selectedSymbol}
              positions={positions.filter(p => p.symbol === selectedSymbol)}
              height={450}
            />

            {currentPrice && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-600 mb-1">BID</p>
                  <p className="text-2xl font-bold text-red-600 font-mono">
                    {currentPrice.bid.toFixed(5)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">ASK</p>
                  <p className="text-2xl font-bold text-green-600 font-mono">
                    {currentPrice.ask.toFixed(5)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">New Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Volume (lots)</Label>
              <Input
                type="number"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Stop Loss (optional)</Label>
              <Input
                type="number"
                step="0.00001"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="0.00000"
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Take Profit (optional)</Label>
              <Input
                type="number"
                step="0.00001"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="0.00000"
                className="font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => executeTrade('BUY')}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                <ArrowUpCircle className="h-4 w-4" />
                BUY
              </Button>
              <Button
                onClick={() => executeTrade('SELL')}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 gap-2"
              >
                <ArrowDownCircle className="h-4 w-4" />
                SELL
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Positions & History</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="open" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="open">Open Positions ({positions.length})</TabsTrigger>
              <TabsTrigger value="history">Trade History ({trades.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="open" className="mt-4">
              {positions.length === 0 ? (
                <p className="py-8 text-center text-slate-600">No open positions</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-600">
                        <th className="pb-2 font-medium">Ticket</th>
                        <th className="pb-2 font-medium">Symbol</th>
                        <th className="pb-2 font-medium">Type</th>
                        <th className="pb-2 font-medium">Volume</th>
                        <th className="pb-2 font-medium">Open Price</th>
                        <th className="pb-2 font-medium">Current</th>
                        <th className="pb-2 font-medium">Pips</th>
                        <th className="pb-2 font-medium">P&L</th>
                        <th className="pb-2 font-medium">SL/TP</th>
                        <th className="pb-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((position) => {
                        const netPnL = position.profit - position.commission - position.swap
                        return (
                          <tr key={position.id} className="border-b hover:bg-slate-50">
                            <td className="py-3 font-mono text-xs">{position.ticket}</td>
                            <td className="font-semibold">{position.symbol}</td>
                            <td>
                              <Badge
                                className={position.type === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                              >
                                {position.type}
                              </Badge>
                            </td>
                            <td>{position.volume}</td>
                            <td className="font-mono">{position.open_price.toFixed(5)}</td>
                            <td className="font-mono">{position.current_price.toFixed(5)}</td>
                            <td className={`font-semibold ${position.pips >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {position.pips >= 0 ? '+' : ''}{position.pips}
                            </td>
                            <td className={`font-semibold ${netPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(netPnL)}
                            </td>
                            <td className="text-xs">
                              {position.stop_loss && <div>SL: {position.stop_loss.toFixed(5)}</div>}
                              {position.take_profit && <div>TP: {position.take_profit.toFixed(5)}</div>}
                            </td>
                            <td>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => closePosition(position.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              {trades.length === 0 ? (
                <p className="py-8 text-center text-slate-600">No trade history</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-600">
                        <th className="pb-2 font-medium">Symbol</th>
                        <th className="pb-2 font-medium">Type</th>
                        <th className="pb-2 font-medium">Volume</th>
                        <th className="pb-2 font-medium">Entry</th>
                        <th className="pb-2 font-medium">Exit</th>
                        <th className="pb-2 font-medium">Pips</th>
                        <th className="pb-2 font-medium">P&L</th>
                        <th className="pb-2 font-medium">Open Time</th>
                        <th className="pb-2 font-medium">Close Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map((trade) => (
                        <tr key={trade.id} className="border-b hover:bg-slate-50">
                          <td className="py-3 font-semibold">{trade.symbol}</td>
                          <td>
                            <Badge
                              className={trade.side === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                            >
                              {trade.side}
                            </Badge>
                          </td>
                          <td>{trade.lot_size}</td>
                          <td className="font-mono">{trade.entry_price.toFixed(5)}</td>
                          <td className="font-mono">{trade.exit_price.toFixed(5)}</td>
                          <td className={`font-semibold ${trade.pips >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {trade.pips >= 0 ? '+' : ''}{trade.pips}
                          </td>
                          <td className={`font-semibold ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(trade.pnl)}
                          </td>
                          <td className="text-xs">{new Date(trade.open_time).toLocaleString()}</td>
                          <td className="text-xs">{new Date(trade.close_time).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
