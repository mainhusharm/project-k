'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, ISeriesApi, IChartApi, LineStyle } from 'lightweight-charts'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { TrendingUp, Minus, Type, Square, Settings } from 'lucide-react'

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

  // Track timeframe changes to detect fresh loads
  const timeframeChangedRef = useRef<boolean>(false)

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
    const interval = setInterval(() => loadChartData(), 5000)

    return () => {
      window.removeEventListener('resize', handleResize)
      clearInterval(interval)
      if (chartRef.current) {
        chartRef.current.remove()
      }
    }
  }, [symbol, height, timeframe])

  useEffect(() => {
    // IMPORTANT: Position updates shoul/ NEVER cause chart /epPORTANT Pgion updates should NEVER cause chart repositioning
    // The zoom state must be preserved across position changes
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
      // Get historical candlestick data from yfinance
      const res = await fetch(`/api/trading/chart-data/${symbol}?bars=100&timeframe=${timeframe}`)

      if (res.ok && candlestickSeriesRef.current) {
        const data = await res.json()
        if (data.candlesticks && Array.isArray(data.candlesticks) && data.candlesticks.length > 0) {
          console.log(`Loaded ${data.candlesticks.length} candlesticks from ${data.source} for ${symbol}`)

          // Sort by time to ensure proper ordering
          const chartData = data.candlesticks.sort((a: any, b: any) => a.time - b.time)

          candlestickSeriesRef.current.setData(chartData)

          if (chartRef.current?.timeScale) {
            // Only auto-position chart on fresh timeframe loads, not on automatic updates
            setTimeout(() => {
              if (chartRef.current?.timeScale) {
                try {
                  // Calculate and set a stable logical range that keeps recent data visible
                  const visibleCandles = 25
                  const totalDataPoints = chartData.length

                  // Only apply default zoom on fresh timeframe changes, not automatic updates
                  if (timeframeChangedRef.current && !userZoomedRef.current) {
                    if (totalDataPoints > visibleCandles) {
                      // Set logical range: from latest-25 to latest, ensuring right edge shows recent data
                      chartRef.current.timeScale().setVisibleLogicalRange({
                        from: totalDataPoints - visibleCandles, // Start point (25 candles back)
                        to: totalDataPoints - 1 // End point (most recent candle)
                      })
                    } else {
                      // If we have fewer data points, show all of them
                      chartRef.current.timeScale().fitContent()
                    }
                    // Mark timeframe change as handled
                    timeframeChangedRef.current = false
                  }
                  // If user has manually zoomed, never touch the zoom level on data updates
                } catch (error) {
                  console.warn('Chart range setting failed:', error)
                  try {
                    // Last resort fallback
                    chartRef.current.timeScale().fitContent()
                  } catch (fitError) {
                    console.warn('Even fitContent failed:', fitError)
                  }
                }
              }
            }, 100)
          }
        } else {
          console.warn('No candlestick data available')
        }
      } else {
        console.error('Failed to load chart data:', res.status, res.statusText)
      }
    } catch (error) {
      console.error('Error loading chart data:', error)
    }
  }

  const drawPositionLines = () => {
    if (!candlestickSeriesRef.current) return

    // Clear existing position lines
    positionLinesRef.current.forEach(line => {
      try {
        candlestickSeriesRef.current?.removePriceLine(line)
      } catch (e) {}
    })
    positionLinesRef.current = []

    positions.forEach((position) => {
      if (!candlestickSeriesRef.current) return

      const color = position.type === 'BUY' ? '#10b981' : '#ef4444'
      const pnlSign = position.profit >= 0 ? '+' : ''

      try {
        // Create price line for entry
        const priceLine = candlestickSeriesRef.current.createPriceLine({
          price: position.open_price,
          color: color,
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `${position.type} ${position.volume} @ ${position.open_price.toFixed(5)} | ${pnlSign}${position.pips} pips | ${pnlSign}$${position.profit.toFixed(2)}`,
        })
        positionLinesRef.current.push(priceLine)

        // Create entry marker
        const markers = [{
          time: Math.floor(new Date(position.open_time).getTime() / 1000) as any,
          position: (position.type === 'BUY' ? 'belowBar' : 'aboveBar') as any,
          color: color,
          shape: (position.type === 'BUY' ? 'arrowUp' : 'arrowDown') as any,
          text: `${position.type}`,
        }]

        candlestickSeriesRef.current.setMarkers(markers)
      } catch (error) {
        console.error('Error drawing position line:', error)
      }
    })

    // Position line updates should NEVER trigger chart auto-positioning
    // The zoom state should remain exactly as user set it
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
        <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded flex items-center justify-between">
          <span>
            <strong>Open Positions:</strong> {positions.length} position{positions.length !== 1 ? 's' : ''} shown on chart
          </span>
          <span className="text-xs text-slate-500">
            Lines show entry prices with live P&L
          </span>
        </div>
      )}
    </div>
  )
}
