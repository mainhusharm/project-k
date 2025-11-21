'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Line } from 'react-chartjs-2'
import { Chart, registerables } from 'chart.js'
import 'chartjs-adapter-date-fns'

Chart.register(...registerables)

interface MarketData {
  symbol: string
  bid: number
  ask: number
  high: number
  low: number
  timestamp: string
  volume: number
}

interface Position {
  id: string
  ticket: string
  symbol: string
  type: 'BUY' | 'SELL'
  volume: number
  open_price: number
  current_price: number
  profit: number
  stop_loss?: number
  take_profit?: number
  commission: number
  open_time: string
}

const SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'GOLD', 'BTCUSD']
const DEMO_BALANCE = 10000

const TRADING_SYMBOLS = {
  'EURUSD': { contractSize: 100000, leverage: 100, minLot: 0.01, maxLot: 100 },
  'GBPUSD': { contractSize: 100000, leverage: 100, minLot: 0.01, maxLot: 100 },
  'USDJPY': { contractSize: 100000, leverage: 100, minLot: 0.01, maxLot: 100 },
  'AUDUSD': { contractSize: 100000, leverage: 100, minLot: 0.01, maxLot: 100 },
  'GOLD': { contractSize: 100, leverage: 100, minLot: 0.01, maxLot: 100 },
  'BTCUSD': { contractSize: 1, leverage: 50, minLot: 0.001, maxLot: 10 }
}

export default function TradingPlatform() {
  const [prices, setPrices] = useState<Record<string, MarketData>>({})
  const [selectedSymbol, setSelectedSymbol] = useState('EURUSD')
  const [positions, setPositions] = useState<Position[]>([])
  const [balance, setBalance] = useState(DEMO_BALANCE)
  const [equity, setEquity] = useState(DEMO_BALANCE)
  const [chartData, setChartData] = useState<any>({ datasets: [] })
  const [volume, setVolume] = useState('0.01')
  const [isLoading, setIsLoading] = useState(false)

  const chartRef = useRef<any>(null)
  const lastPrices = useRef<Record<string, number>>({})

  // Initialize market data with real YFinance-like prices
  useEffect(() => {
    const initPrices = SYMBOLS.reduce((acc, symbol) => {
      const basePrices = {
        'EURUSD': { bid: 1.0823, ask: 1.0825 },
        'GBPUSD': { bid: 1.2678, ask: 1.2680 },
        'USDJPY': { bid: 147.25, ask: 147.35 },
        'AUDUSD': { bid: 0.6678, ask: 0.6680 },
        'GOLD': { bid: 1967.50, ask: 1970.00 },
        'BTCUSD': { bid: 43850.00, ask: 43900.00 }
      }
      const price = basePrices[symbol as keyof typeof basePrices] || { bid: 1.00, ask: 1.02 }
      acc[symbol] = {
        ...price,
        symbol,
        high: price.ask,
        low: price.bid,
        timestamp: new Date().toISOString(),
        volume: Math.floor(Math.random() * 10000)
      }
      return acc
    }, {} as Record<string, MarketData>)

    setPrices(initPrices)
    lastPrices.current = Object.fromEntries(
      Object.entries(initPrices).map(([sym, data]) => [sym, data.ask])
    )

    // Update prices every 1.5 seconds (like real trading)
    const priceInterval = setInterval(updatePrices, 1500)
    const positionInterval = setInterval(updatePositions, 1000)

    return () => {
      clearInterval(priceInterval)
      clearInterval(positionInterval)
    }
  }, [])

  useEffect(() => {
    loadChartData(selectedSymbol)
  }, [selectedSymbol])

  const updatePrices = () => {
    setPrices(prevPrices => {
      const newPrices = { ...prevPrices }
      const touchedPrices = { ...lastPrices.current }

      Object.keys(newPrices).forEach(symbol => {
        const current = newPrices[symbol]
        const volatility = getVolatilityForSymbol(symbol)
        const change = (Math.random() - 0.5) * 2 * volatility * current.ask

        const newMidPrice = Math.max(0.0001, current.ask + change)
        const spread = getSpreadForSymbol(symbol)

        const bid = Math.max(0.0001, newMidPrice - spread / 2)
        const ask = newMidPrice + spread / 2

        newPrices[symbol] = {
          ...newPrices[symbol],
          bid: Math.round(bid * getDecimalPlaces(symbol)) / getDecimalPlaces(symbol),
          ask: Math.round(ask * getDecimalPlaces(symbol)) / getDecimalPlaces(symbol),
          high: Math.max(current.high, ask),
          low: Math.min(current.low, bid),
          timestamp: new Date().toISOString(),
          volume: Math.floor(Math.random() * 10000)
        }

        touchedPrices[symbol] = ask
      })

      lastPrices.current = touchedPrices
      return newPrices
    })
  }

  const getVolatilityForSymbol = (symbol: string): number => {
    const volatilities = {
      'EURUSD': 0.0003, 'GBPUSD': 0.0004, 'USDJPY': 0.05,
      'AUDUSD': 0.0003, 'GOLD': 0.50, 'BTCUSD': 50.0
    }
    return volatilities[symbol as keyof typeof volatilities] || 0.0003
  }

  const getSpreadForSymbol = (symbol: string): number => {
    const spreads = {
      'EURUSD': 0.0002, 'GBPUSD': 0.0002, 'USDJPY': 0.02,
      'AUDUSD': 0.0002, 'GOLD': 0.50, 'BTCUSD': 25.0
    }
    return spreads[symbol as keyof typeof spreads] || 0.0002
  }

  const getDecimalPlaces = (symbol: string): number => {
    if (symbol === 'BTCUSD') return 2
    if (symbol.includes('JPY')) return 2
    if (symbol === 'GOLD') return 2
    return symbol.length === 6 ? 5 : 2
  }

  const updatePositions = () => {
    setPositions(prevPositions =>
      prevPositions.map(pos => {
        const currentPrice = pos.type === 'BUY' ? prices[pos.symbol]?.bid : prices[pos.symbol]?.ask

        if (!currentPrice) return pos

        const symbolSpec = TRADING_SYMBOLS[pos.symbol as keyof typeof TRADING_SYMBOLS] || TRADING_SYMBOLS.EURUSD
        let pnl = 0

        // Calculate P&L with proper pip values
        if (pos.type === 'BUY') {
          pnl = (currentPrice - pos.open_price) * pos.volume * symbolSpec.contractSize
        } else {
          pnl = (pos.open_price - currentPrice) * pos.volume * symbolSpec.contractSize
        }

        pnl = pnl - pos.commission

        return {
          ...pos,
          current_price: currentPrice,
          profit: pnl
        }
      })
    )

    const totalPnL = positions.reduce((sum, pos) => sum + pos.profit, 0)
    setEquity(balance + totalPnL)
  }

  const loadChartData = (symbol: string) => {
    const dataPoints = []
    let currentPrice = lastPrices.current[symbol] || 1.0
    const now = Date.now()

    // Generate 100 data points (last 100 minutes)
    for (let i = 99; i >= 0; i--) {
      const time = new Date(now - i * 60000)
      const volatility = getVolatilityForSymbol(symbol) / 10 // Reduced for chart
      const change = (Math.random() - 0.5) * 2 * volatility * currentPrice
      currentPrice += change

      // Trending behavior
      currentPrice += 0.00001 // Slight upward trend

      currentPrice = Math.max(0.0001, currentPrice)

      dataPoints.push({
        x: time,
        y: Math.round(currentPrice * getDecimalPlaces(symbol)) / getDecimalPlaces(symbol)
      })
    }

    setChartData({
      datasets: [{
        label: symbol,
        data: dataPoints,
        borderColor: currentPrice > dataPoints[50]?.y ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
        backgroundColor: currentPrice > dataPoints[50]?.y ?
          'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 4,
      }]
    })

    if (chartRef.current?.chart) {
      chartRef.current.chart.update()
    }
  }

  const executeOrder = async (type: 'BUY' | 'SELL') => {
    if (!selectedSymbol || !prices[selectedSymbol]) return

    setIsLoading(true)

    const symbolSpec = TRADING_SYMBOLS[selectedSymbol as keyof typeof TRADING_SYMBOLS] || TRADING_SYMBOLS.EURUSD
    const currentPrice = type === 'BUY' ? prices[selectedSymbol].ask : prices[selectedSymbol].bid
    const vol = parseFloat(volume)

    // Validate volume
    if (vol < symbolSpec.minLot || vol > symbolSpec.maxLot) {
      alert(`Volume must be between ${symbolSpec.minLot} and ${symbolSpec.maxLot} lots`)
      setIsLoading(false)
      return
    }

    // Calculate margin requirement
    const marginRequired = (vol * symbolSpec.contractSize * currentPrice) / symbolSpec.leverage
    const usedMargin = positions.reduce((sum, pos) => {
      const posSpec = TRADING_SYMBOLS[pos.symbol as keyof typeof TRADING_SYMBOLS] || TRADING_SYMBOLS.EURUSD
      return sum + (pos.volume * posSpec.contractSize * pos.open_price) / posSpec.leverage
    }, marginRequired)

    if (usedMargin + marginRequired > balance) {
      alert('Not enough balance! Margin requirement: $' + marginRequired.toFixed(2))
      setIsLoading(false)
      return
    }

    const newPosition: Position = {
      id: `pos-${Date.now()}`,
      ticket: Math.floor(Math.random() * 10000000).toString(),
      symbol: selectedSymbol,
      type,
      volume: vol,
      open_price: currentPrice,
      current_price: currentPrice,
      profit: 0,
      stop_loss: undefined,
      take_profit: undefined,
      commission: vol * 0.25, // $0.25 per lot commission
      open_time: new Date().toISOString()
    }

    setPositions(prev => [...prev, newPosition])

    setIsLoading(false)
    alert('MT5 Order Executed Successfully! Ticket: ' + newPosition.ticket)
  }

  const closePosition = (positionId: string) => {
    const positionIndex = positions.findIndex(p => p.id === positionId)
    if (positionIndex === -1) return

    const position = positions[positionIndex]
    const finalPrice = position.current_price

    const symbolSpec = TRADING_SYMBOLS[position.symbol as keyof typeof TRADING_SYMBOLS] || TRADING_SYMBOLS.EURUSD
    let finalPnL = 0

    if (position.type === 'BUY') {
      finalPnL = (finalPrice - position.open_price) * position.volume * symbolSpec.contractSize
    } else {
      finalPnL = (position.open_price - finalPrice) * position.volume * symbolSpec.contractSize
    }

    finalPnL = finalPnL - position.commission

    const newBalance = balance + finalPnL
    setBalance(newBalance)
    setEquity(newBalance)

    setPositions(prev => prev.filter(p => p.id !== positionId))

    alert(`Position closed. P&L: $${finalPnL.toFixed(2)}`)
  }

  const currentPrice = prices[selectedSymbol]
  const symbolSpec = TRADING_SYMBOLS[selectedSymbol as keyof typeof TRADING_SYMBOLS] || TRADING_SYMBOLS.EURUSD
  const usedMargin = positions.reduce((sum, pos) => {
    const posSpec = TRADING_SYMBOLS[pos.symbol as keyof typeof TRADING_SYMBOLS] || TRADING_SYMBOLS.EURUSD
    return sum + (pos.volume * posSpec.contractSize * pos.open_price) / posSpec.leverage
  }, 0)
  const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : 0
  const totalPnL = positions.reduce((sum, pos) => sum + pos.profit, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            MT5 + TradingView Trading Platform
          </h1>
          <p className="text-lg text-gray-600">
            Real-time Forex & CFD trading with professional execution
          </p>
        </div>

        {/* Account Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Balance', value: balance.toFixed(2), prefix: '$' },
            { label: 'Equity', value: equity.toFixed(2), prefix: '$', subvalue: totalPnL.toFixed(2) },
            { label: 'Margin Used', value: usedMargin.toFixed(2), prefix: '$' },
            { label: 'Free Margin', value: (equity - usedMargin).toFixed(2), prefix: '$' },
            { label: 'Margin Level', value: marginLevel.toFixed(0), suffix: '%' }
          ].map((item, index) => (
            <div key={index} className="bg-white rounded-lg shadow-lg p-4 text-center">
              <div className="text-sm text-gray-500 mb-1">{item.label}</div>
              <div className="text-2xl font-bold text-gray-900">
                {item.prefix || ''}{item.value}{item.suffix || ''}
              </div>
              {item.subvalue && (
                <div className={`text-xs mt-1 ${parseFloat(item.subvalue) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {parseFloat(item.subvalue) >= 0 ? '+' : ''}{item.subvalue}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Market Watch */}
          <div className="bg-white rounded-lg shadow-lg">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-lg">Market Watch</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {SYMBOLS.map((symbol) => {
                const price = prices[symbol]
                return (
                  <button
                    key={symbol}
                    onClick={() => setSelectedSymbol(symbol)}
                    className={`w-full flex justify-between items-center p-3 hover:bg-gray-50 transition ${
                      selectedSymbol === symbol ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                    }`}
                  >
                    <span className="font-semibold text-sm">{symbol}</span>
                    {price && (
                      <div className="text-right">
                        <div className="flex gap-2">
                          <span className="text-red-600 text-xs font-mono">
                            ${price.bid.toFixed(getDecimalPlaces(symbol))}
                          </span>
                          <span className="text-green-600 text-xs font-mono">
                            ${price.ask.toFixed(getDecimalPlaces(symbol))}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">Spread: {getSpreadForSymbol(symbol)}</div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* TradingView Chart */}
          <div className="xl:col-span-2 bg-white rounded-lg shadow-lg">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg">{selectedSymbol} Chart</h3>
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  📊 TradingView Style
                  <span className={`px-2 py-1 rounded text-xs ${
                    currentPrice?.ask > lastPrices.current[selectedSymbol] + 0.0001
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    Live
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="h-96">
                <Line
                  ref={chartRef}
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false }
                    },
                    scales: {
                      x: {
                        type: 'time',
                        time: { unit: 'minute', displayFormats: { minute: 'HH:mm' } },
                        ticks: { maxTicksLimit: 6 }
                      },
                      y: {
                        ticks: {
                          callback: function(value: any) {
                            return '$' + value.toFixed(getDecimalPlaces(selectedSymbol))
                          }
                        }
                      }
                    },
                    interaction: { intersect: false, mode: 'index' }
                  }}
                />
              </div>

              {currentPrice && (
                <div className="mt-4 grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 uppercase">Bid</div>
                    <div className="text-2xl font-bold text-red-600 font-mono">
                      ${currentPrice.bid.toFixed(getDecimalPlaces(selectedSymbol))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 uppercase">Ask</div>
                    <div className="text-2xl font-bold text-green-600 font-mono">
                      ${currentPrice.ask.toFixed(getDecimalPlaces(selectedSymbol))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 uppercase">Spread</div>
                    <div className="text-lg font-bold text-blue-600">
                      {(getSpreadForSymbol(selectedSymbol) * Math.pow(10, getDecimalPlaces(selectedSymbol))).toFixed(1)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MT5 Order Panel */}
          <div className="bg-white rounded-lg shadow-lg">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-lg">MT5 New Order</h3>
              <div className="text-sm text-gray-600">{selectedSymbol}</div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Volume (lots)
                </label>
                <input
                  type="number"
                  step={symbolSpec.minLot}
                  min={symbolSpec.minLot}
                  max={symbolSpec.maxLot}
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 transition"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Min: {symbolSpec.minLot} | Max: {symbolSpec.maxLot}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => executeOrder('BUY')}
                  disabled={isLoading || !currentPrice}
                  className="bg-green-600 text-white py-4 px-4 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 transition-all shadow-lg"
                >
                  📈 BUY
                </button>
                <button
                  onClick={() => executeOrder('SELL')}
                  disabled={isLoading || !currentPrice}
                  className="bg-red-600 text-white py-4 px-4 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg"
                >
                  📉 SELL
                </button>
              </div>

              <div className="border-t pt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Contract Size:</span>
                  <span className="font-semibold">{symbolSpec.contractSize.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Leverage:</span>
                  <span className="font-semibold">1:{symbolSpec.leverage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Open Positions:</span>
                  <span className="font-semibold">{positions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Margin Req:</span>
                  <span className="font-semibold text-blue-600">
                    ${((parseFloat(volume) || 0) * symbolSpec.contractSize * (currentPrice?.ask || 1) / symbolSpec.leverage).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Positions Table */}
        <div className="bg-white rounded-lg shadow-lg mt-6">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-lg">Open Positions ({positions.length})</h3>
          </div>
          {positions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-4">📊</div>
              <p>No open positions</p>
              <p className="text-sm">Execute a trade to see your positions here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-4 text-left font-semibold">Ticket</th>
                    <th className="py-3 px-4 text-left font-semibold">Symbol</th>
                    <th className="py-3 px-4 text-left font-semibold">Type</th>
                    <th className="py-3 px-4 text-right font-semibold">Volume</th>
                    <th className="py-3 px-4 text-right font-semibold">Open Price</th>
                    <th className="py-3 px-4 text-right font-semibold">Current Price</th>
                    <th className="py-3 px-4 text-right font-semibold">Profit</th>
                    <th className="py-3 px-4 text-center font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => (
                    <tr key={position.id} className="border-b hover:bg-gray-50 transition">
                      <td className="py-3 px-4 font-mono text-sm">{position.ticket}</td>
                      <td className="py-3 px-4 font-semibold">{position.symbol}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          position.type === 'BUY'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {position.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">{position.volume.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        ${position.open_price.toFixed(getDecimalPlaces(position.symbol))}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        ${position.current_price.toFixed(getDecimalPlaces(position.symbol))}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${
                        position.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {position.profit >= 0 ? '+' : ''}${position.profit.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => closePosition(position.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
