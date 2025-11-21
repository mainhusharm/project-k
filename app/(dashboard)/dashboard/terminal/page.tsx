'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ArrowUpCircle, ArrowDownCircle, X, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/format'

const SYMBOLS = [
  { symbol: 'BTCUSD', name: 'Bitcoin', tvSymbol: 'BINANCE:BTCUSDT' },
  { symbol: 'ETHUSD', name: 'Ethereum', tvSymbol: 'BINANCE:ETHUSDT' },
  { symbol: 'EURUSD', name: 'Euro/US Dollar', tvSymbol: 'FX:EURUSD' },
  { symbol: 'GBPUSD', name: 'British Pound/US Dollar', tvSymbol: 'FX:GBPUSD' },
  { symbol: 'USDJPY', name: 'US Dollar/Japanese Yen', tvSymbol: 'FX:USDJPY' },
  { symbol: 'GOLD', name: 'Gold', tvSymbol: 'OANDA:XAUUSD' },
  { symbol: 'AAPL', name: 'Apple Inc.', tvSymbol: 'NASDAQ:AAPL' },
  { symbol: 'TSLA', name: 'Tesla Inc.', tvSymbol: 'NASDAQ:TSLA' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', tvSymbol: 'NASDAQ:GOOGL' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', tvSymbol: 'NASDAQ:MSFT' },
  { symbol: 'SPX', name: 'S&P 500', tvSymbol: 'INDEX:SPX' },
]

interface Position {
  id: string
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  entry_price: number
  current_price: number
  profit: number
  leverage: number
  stop_loss?: number
  take_profit?: number
}

export default function WebTerminalPage() {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [selectedSymbol, setSelectedSymbol] = useState(SYMBOLS[0])
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [quantity, setQuantity] = useState('1')
  const [leverage, setLeverage] = useState('1')
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [positions, setPositions] = useState<Position[]>([])
  const [balance, setBalance] = useState(10000)
  const [equity, setEquity] = useState(10000)
  const [accountId, setAccountId] = useState<string>('')

  useEffect(() => {
    initAccount()
  }, [])

  useEffect(() => {
    if (accountId) {
      loadPositions()
      loadAccount()
      const interval = setInterval(() => {
        loadPositions()
        loadAccount()
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [accountId])

  useEffect(() => {
    if (!chartContainerRef.current) return

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: selectedSymbol.tvSymbol,
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: 'rgba(19, 23, 41, 1)',
      allow_symbol_change: true,
      calendar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      studies: [],
      support_host: 'https://www.tradingview.com'
    })

    chartContainerRef.current.innerHTML = ''
    const container = document.createElement('div')
    container.className = 'tradingview-widget-container__widget'
    container.style.height = 'calc(100% - 32px)'
    container.style.width = '100%'
    chartContainerRef.current.appendChild(container)
    chartContainerRef.current.appendChild(script)

    return () => {
      if (chartContainerRef.current) {
        chartContainerRef.current.innerHTML = ''
      }
    }
  }, [selectedSymbol])

  const initAccount = async () => {
    try {
      const res = await fetch('/api/demo/setup', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setAccountId(data.accountId)
      }
    } catch (error) {
      console.error('Failed to init account:', error)
    }
  }

  const loadAccount = async () => {
    if (!accountId) return
    try {
      const res = await fetch(`/api/trading/account/${accountId}`)
      if (res.ok) {
        const data = await res.json()
        setBalance(data.balance || 10000)
      }
    } catch (error) {
      console.error('Failed to load account:', error)
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

  const executeTrade = async () => {
    if (!accountId) {
      alert('Account not initialized')
      return
    }

    try {
      const res = await fetch('/api/trading/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          symbol: selectedSymbol.symbol,
          type: side,
          volume: parseFloat(quantity),
          leverage: parseFloat(leverage),
          stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
          takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
        }),
      })

      if (res.ok) {
        await loadPositions()
        await loadAccount()
        setQuantity('1')
        setStopLoss('')
        setTakeProfit('')
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Order execution error:', error)
      alert('Failed to execute order')
    }
  }

  const closePosition = async (positionId: string) => {
    if (!confirm('Close this position?')) return

    try {
      const res = await fetch(`/api/trading/positions/${positionId}/close`, {
        method: 'POST',
      })

      if (res.ok) {
        await loadPositions()
        await loadAccount()
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Close position error:', error)
      alert('Failed to close position')
    }
  }

  const totalPnL = positions.reduce((sum, p) => sum + p.profit, 0)

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Web Terminal</h1>
          <p className="text-slate-600 mt-1">Professional Trading Interface</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
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
            <CardTitle className="text-sm font-medium text-slate-600">Open Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{positions.length}</p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalPnL)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-[1fr_350px] gap-4 flex-1 min-h-0">
        <div className="flex flex-col gap-4">
          <Card className="flex-1 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {selectedSymbol.name} ({selectedSymbol.symbol})
                </CardTitle>
                <Select value={selectedSymbol.symbol} onValueChange={(value) => {
                  const symbol = SYMBOLS.find(s => s.symbol === value)
                  if (symbol) setSelectedSymbol(symbol)
                }}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SYMBOLS.map((sym) => (
                      <SelectItem key={sym.symbol} value={sym.symbol}>
                        {sym.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-60px)]">
              <div
                ref={chartContainerRef}
                className="tradingview-widget-container"
                style={{ height: '100%', width: '100%' }}
              />
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Open Positions</CardTitle>
            </CardHeader>
            <CardContent>
              {positions.length === 0 ? (
                <p className="text-center text-slate-600 py-8">No open positions</p>
              ) : (
                <div className="space-y-2">
                  {positions.map((position) => (
                    <div
                      key={position.id}
                      className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${
                        position.side === 'BUY' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={position.side === 'BUY' ? 'default' : 'destructive'}>
                            {position.side}
                          </Badge>
                          <span className="font-semibold">{position.symbol}</span>
                          <span className="text-sm text-slate-600">
                            {position.quantity} @ {position.entry_price.toFixed(5)}
                          </span>
                          {position.leverage > 1 && (
                            <Badge variant="outline">{position.leverage}x</Badge>
                          )}
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-slate-600">
                          {position.stop_loss && <span>SL: {position.stop_loss.toFixed(5)}</span>}
                          {position.take_profit && <span>TP: {position.take_profit.toFixed(5)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`font-bold ${position.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(position.profit)}
                          </p>
                          <p className="text-xs text-slate-600">
                            Current: {position.current_price.toFixed(5)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => closePosition(position.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-md h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={side === 'BUY' ? 'default' : 'outline'}
                className={side === 'BUY' ? 'bg-green-600 hover:bg-green-700' : ''}
                onClick={() => setSide('BUY')}
              >
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                BUY
              </Button>
              <Button
                variant={side === 'SELL' ? 'default' : 'outline'}
                className={side === 'SELL' ? 'bg-red-600 hover:bg-red-700' : ''}
                onClick={() => setSide('SELL')}
              >
                <ArrowDownCircle className="h-4 w-4 mr-2" />
                SELL
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs text-slate-600">Quantity</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-600">Leverage</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="range"
                    min="1"
                    max="50"
                    value={leverage}
                    onChange={(e) => setLeverage(e.target.value)}
                    className="flex-1"
                  />
                  <span className="font-bold text-blue-600 min-w-[40px]">{leverage}x</span>
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-600">Stop Loss (optional)</Label>
                <Input
                  type="number"
                  step="0.00001"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder="0.00000"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-600">Take Profit (optional)</Label>
                <Input
                  type="number"
                  step="0.00001"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  placeholder="0.00000"
                  className="mt-1"
                />
              </div>
            </div>

            <Button
              onClick={executeTrade}
              className={`w-full h-12 text-base font-semibold ${
                side === 'BUY' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {side === 'BUY' ? (
                <>
                  <TrendingUp className="h-5 w-5 mr-2" />
                  EXECUTE BUY ORDER
                </>
              ) : (
                <>
                  <TrendingDown className="h-5 w-5 mr-2" />
                  EXECUTE SELL ORDER
                </>
              )}
            </Button>

            <div className="pt-3 border-t text-xs text-slate-600">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Position Value:</span>
                  <span className="font-semibold">{formatCurrency(parseFloat(quantity || '0') * 1000 * parseFloat(leverage || '1'))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Margin Required:</span>
                  <span className="font-semibold">{formatCurrency(parseFloat(quantity || '0') * 1000)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
