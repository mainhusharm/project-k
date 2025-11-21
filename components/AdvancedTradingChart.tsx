'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, ISeriesApi, IChartApi, LineStyle, Time, SeriesMarker } from 'lightweight-charts'
import { Button } from './ui/button'
import { TrendingUp, Minus, Type, Square } from 'lucide-react'

interface Position {
  id: string
  symbol: string
  type: 'BUY' | 'SELL'
  open_price: number
  profit: number
  pips: number
  volume: number
  open_time: string
  stop_loss?: number
  take_profit?: number
}

interface AdvancedTradingChartProps {
  symbol: string
  positions?: Position[]
  height?: number
  onUpdatePosition?: (positionId: string, updates: Partial<Position>) => void
}

type DrawingTool = 'none' | 'trendline' | 'horizontal' | 'vertical' | 'rectangle'

export function AdvancedTradingChart({ symbol, positions = [], height = 500 }: AdvancedTradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [selectedTool, setSelectedTool] = useState<DrawingTool>('none')
  const [timeframe, setTimeframe] = useState<string>('1')
  const positionLinesRef = useRef<any[]>([])
  const userZoomedRef = useRef<boolean>(false)
  const lastTimeframeRef = useRef<string>('1')
  const timeframeChangedRef = useRef<boolean>(false)
  const lastPriceRef = useRef<number | null>(null)
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const timeframes = [
    { label: '1m', value: '1' },
    { label: '5m', value: '5' },
    { label: '15m', value: '15' },
    { label: '30m', value: '30' },
    { label: '1h', value: '60' },
    { label: '4h', value: '240' },
    { label: 'D', value: '1D' },
  ]

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#64748b',
        fontSize: 12,
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      grid: {
        vertLines: { color: '#f1f5f9' },
        horzLines: { color: '#f1f5f9' },
      },
      crosshair: {
        mode: 1,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#e2e8f0',
      },
      rightPriceScale: {
        borderColor: '#e2e8f0',
      },
    })

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    })

    chartRef.current = chart
    candlestickSeriesRef.current = candlestickSeries

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    loadChartData()
    const chartInterval = setInterval(() => loadChartData(), 5000)

    const priceUpdateInterval = setInterval(() => updateRealtimePrice(), 2000)
    updateIntervalRef.current = priceUpdateInterval

    return () => {
      window.removeEventListener('resize', handleResize)
      clearInterval(chartInterval)
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
      if (chartRef.current) {
        chartRef.current.remove()
      }
    }
  }, [symbol, height, timeframe])

  useEffect(() => {
    console.log('Updating position lines - preserving zoom state')
    drawPositionLines()
  }, [positions])

  useEffect(() => {
    if (!chartRef.current) return

    // Add handlers to detect user zoom/scroll interactions
    const handleVisibleTimeRangeChange = (newVisibleTimeRange: any) => {
      // If user changes the visible range manually, mark as user zoomed
      if (newVisibleTimeRange) {
        userZoomedRef.current = true
      }
    }

    const handleVisibleLogicalRangeChange = (newVisibleLogicalRange: any) => {
      // If user changes the logical range manually, mark as user zoomed
      if (newVisibleLogicalRange) {
        userZoomedRef.current = true
      }
    }

    const handleClick = (param: any) => {
      if (param.time) {
        console.log('Chart clicked at time:', param.time, 'price:', param.seriesPrices.values().next().value)
      }
    }

    // Subscribe to user interaction events
    chartRef.current.timeScale().subscribeVisibleTimeRangeChange(handleVisibleTimeRangeChange)
    chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange)
    chartRef.current.subscribeClick(handleClick)

    return () => {
      if (chartRef.current) {
        chartRef.current.timeScale().unsubscribeVisibleTimeRangeChange(handleVisibleTimeRangeChange)
        chartRef.current.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange)
        chartRef.current.unsubscribeClick(handleClick)
      }
    }
  }, [])

  const loadChartData = async () => {
    try {
      const res = await fetch(`/api/trading/chart-data/${symbol}?bars=100&timeframe=${timeframe}`)

      if (res.ok && candlestickSeriesRef.current) {
        const data = await res.json()
        if (data.candlesticks && Array.isArray(data.candlesticks) && data.candlesticks.length > 0) {
          const chartData = data.candlesticks.sort((a: any, b: any) => a.time - b.time)

          candlestickSeriesRef.current.setData(chartData)

          if (chartData.length > 0) {
            lastPriceRef.current = chartData[chartData.length - 1].close
          }

          if (chartRef.current?.timeScale) {
            setTimeout(() => {
              if (chartRef.current?.timeScale) {
                try {
                  const visibleCandles = 50
                  const totalDataPoints = chartData.length

                  if (timeframeChangedRef.current && !userZoomedRef.current) {
                    if (totalDataPoints > visibleCandles) {
                      chartRef.current.timeScale().setVisibleLogicalRange({
                        from: totalDataPoints - visibleCandles,
                        to: totalDataPoints - 1
                      })
                    } else {
                      chartRef.current.timeScale().fitContent()
                    }
                    timeframeChangedRef.current = false
                  }
                } catch (error) {
                  console.warn('Chart range setting failed:', error)
                }
              }
            }, 100)
          }
        }
      }
    } catch (error) {
      console.error('Error loading chart data:', error)
    }
  }

  const updateRealtimePrice = async () => {
    if (!candlestickSeriesRef.current) return

    try {
      const res = await fetch(`/api/trading/market-data/${symbol}`)
      if (res.ok) {
        const data = await res.json()
        const currentPrice = data.price?.bid

        if (currentPrice && lastPriceRef.current) {
          const now = Math.floor(Date.now() / 1000) as Time
          const lastCandle = candlestickSeriesRef.current.dataByIndex(999999)

          if (lastCandle) {
            const variation = (Math.random() - 0.5) * (currentPrice * 0.0001)
            const newPrice = currentPrice + variation

            const updatedCandle = {
              time: now,
              open: lastPriceRef.current,
              high: Math.max(lastPriceRef.current, newPrice),
              low: Math.min(lastPriceRef.current, newPrice),
              close: newPrice
            }

            candlestickSeriesRef.current.update(updatedCandle)
            lastPriceRef.current = newPrice
          }
        }
      }
    } catch (error) {
      console.error('Error updating realtime price:', error)
    }
  }

  const drawPositionLines = () => {
    if (!candlestickSeriesRef.current) return

    positionLinesRef.current.forEach(line => {
      try {
        candlestickSeriesRef.current?.removePriceLine(line)
      } catch (e) {}
    })
    positionLinesRef.current = []

    const markers: SeriesMarker<Time>[] = []

    positions.forEach((position) => {
      if (!candlestickSeriesRef.current) return

      const isBuy = position.type === 'BUY'
      const lineColor = isBuy ? '#3b82f6' : '#ef4444'
      const bgColor = isBuy ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)'
      const pnlSign = position.profit >= 0 ? '+' : ''

      const lotDisplay = position.volume.toFixed(2)
      const profitDisplay = `${pnlSign}$${Math.abs(position.profit).toFixed(2)}`
      const pipsDisplay = `${pnlSign}${Math.abs(position.pips).toFixed(1)}`

      try {
        const entryLine = candlestickSeriesRef.current.createPriceLine({
          price: position.open_price,
          color: lineColor,
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `${isBuy ? '🔵' : '🔴'} ${position.type} ${lotDisplay} | ${profitDisplay} | ${pipsDisplay} pips`,
        })
        positionLinesRef.current.push(entryLine)

        if (position.stop_loss) {
          const slLine = candlestickSeriesRef.current.createPriceLine({
            price: position.stop_loss,
            color: '#ef4444',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `SL ${position.stop_loss.toFixed(5)}`,
          })
          positionLinesRef.current.push(slLine)
        }

        if (position.take_profit) {
          const tpLine = candlestickSeriesRef.current.createPriceLine({
            price: position.take_profit,
            color: '#10b981',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `TP ${position.take_profit.toFixed(5)}`,
          })
          positionLinesRef.current.push(tpLine)
        }

        const entryTime = Math.floor(new Date(position.open_time).getTime() / 1000) as Time
        markers.push({
          time: entryTime,
          position: isBuy ? 'belowBar' : 'aboveBar',
          color: lineColor,
          shape: isBuy ? 'arrowUp' : 'arrowDown',
          text: `${isBuy ? 'BUY' : 'SELL'} ${lotDisplay}`,
        })
      } catch (error) {
        console.error('Error drawing position line:', error)
      }
    })

    if (markers.length > 0) {
      try {
        candlestickSeriesRef.current.setMarkers(markers)
      } catch (error) {
        console.error('Error setting markers:', error)
      }
    }
  }

  const drawingTools = [
    { icon: TrendingUp, label: 'Trend Line', value: 'trendline' as DrawingTool },
    { icon: Minus, label: 'Horizontal', value: 'horizontal' as DrawingTool },
    { icon: Type, label: 'Vertical', value: 'vertical' as DrawingTool },
    { icon: Square, label: 'Rectangle', value: 'rectangle' as DrawingTool },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg">
        <div className="flex gap-1">
          {timeframes.map((tf) => (
            <Button
              key={tf.value}
              variant={timeframe === tf.value ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => {
                if (lastTimeframeRef.current !== tf.value) {
                  timeframeChangedRef.current = true
                  userZoomedRef.current = false // Reset zoom preference on timeframe change
                  lastTimeframeRef.current = tf.value
                  setTimeframe(tf.value)
                }
              }}
            >
              {tf.label}
            </Button>
          ))}
        </div>

        <div className="flex gap-1 border-l pl-2">
          {drawingTools.map((tool) => (
            <Button
              key={tool.value}
              variant={selectedTool === tool.value ? 'default' : 'ghost'}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setSelectedTool(tool.value)}
              title={tool.label}
            >
              <tool.icon className="h-3.5 w-3.5" />
            </Button>
          ))}
        </div>
      </div>

      <div
        ref={chartContainerRef}
        className="w-full rounded-lg border border-slate-200 bg-white shadow-sm"
        style={{ height: `${height}px` }}
      />

      {positions.length > 0 && (
        <div className="text-xs bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <div className="flex items-start gap-4">
            <div>
              <span className="font-semibold text-slate-900">{positions.length}</span>
              <span className="text-slate-600 ml-1">open position{positions.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex-1 space-y-1">
              {positions.map((pos, idx) => {
                const pnlColor = pos.profit >= 0 ? 'text-green-600' : 'text-red-600'
                return (
                  <div key={pos.id} className="flex items-center justify-between text-xs">
                    <span className="font-medium">
                      {pos.type === 'BUY' ? '🔵' : '🔴'} {pos.symbol} {pos.volume}
                    </span>
                    <span className={pnlColor}>
                      {pos.profit >= 0 ? '+' : ''}${pos.profit.toFixed(2)} ({pos.profit >= 0 ? '+' : ''}{pos.pips.toFixed(1)} pips)
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
