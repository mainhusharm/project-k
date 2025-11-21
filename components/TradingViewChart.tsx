'use client'

import { useEffect, useRef } from 'react'
import { createChart, ColorType } from 'lightweight-charts'

interface CandlestickData {
  time: number
  open: number
  high: number
  low: number
  close: number
}

interface Position {
  id: string
  symbol: string
  type: 'BUY' | 'SELL'
  open_price: number
}

interface TradingViewChartProps {
  symbol: string
  height?: number
  positions?: Position[]
}

export function TradingViewChart({ symbol, height = 450, positions = [] }: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const candlestickSeriesRef = useRef<any>(null)
  const positionMarkersRef = useRef<any[]>([])

  useEffect(() => {
    if (!chartContainerRef.current) return

    try {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#ffffff' },
          textColor: '#64748b',
          fontSize: 12,
        },
        width: chartContainerRef.current.clientWidth,
        height: height,
        grid: {
          vertLines: {
            color: '#f1f5f9',
          },
          horzLines: {
            color: '#f1f5f9',
          },
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

      const interval = setInterval(() => {
        loadChartData()
      }, 5000)

      return () => {
        window.removeEventListener('resize', handleResize)
        clearInterval(interval)
        if (chartRef.current) {
          chartRef.current.remove()
        }
      }
    } catch (error) {
      console.error('Chart initialization error:', error)
    }
  }, [symbol, height])

  const loadChartData = async () => {
    try {
      const res = await fetch(`/api/trading/chart-data/${symbol}?bars=100`)
      if (!res.ok) {
        console.error('Failed to fetch chart data:', res.status)
        return
      }

      const data = await res.json()

      if (data.candlesticks && Array.isArray(data.candlesticks) && candlestickSeriesRef.current) {
        candlestickSeriesRef.current.setData(data.candlesticks)
        if (chartRef.current?.timeScale) {
          chartRef.current.timeScale().fitContent()
        }
        updatePositionMarkers()
      }
    } catch (error) {
      console.error('Failed to load chart data:', error)
    }
  }

  const updatePositionMarkers = () => {
    if (!candlestickSeriesRef.current) return

    positionMarkersRef.current.forEach(marker => {
      try {
        candlestickSeriesRef.current.removeMarker?.(marker)
      } catch (e) {
      }
    })
    positionMarkersRef.current = []

    positions.forEach(position => {
      const marker = {
        time: Math.floor(Date.now() / 1000),
        position: 'inBar' as const,
        color: position.type === 'BUY' ? '#10b981' : '#ef4444',
        shape: position.type === 'BUY' ? 'arrowUp' : 'arrowDown',
        text: `${position.type} @ ${position.open_price.toFixed(5)}`,
      }
      positionMarkersRef.current.push(marker)
    })

    if (positionMarkersRef.current.length > 0) {
      try {
        candlestickSeriesRef.current.setMarkers(positionMarkersRef.current)
      } catch (e) {
        console.error('Failed to set markers:', e)
      }
    }
  }

  useEffect(() => {
    updatePositionMarkers()
  }, [positions])

  return (
    <div
      ref={chartContainerRef}
      className="w-full rounded-lg border border-slate-200 bg-white shadow-sm"
      style={{ height: `${height}px` }}
    />
  )
}
