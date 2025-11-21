/**
 * Next.js compatible YFinance price fetcher
 * Calls Python YFinance script from within lib directory
 */

import { spawn } from 'child_process'
import path from 'path'

interface PriceData {
  symbol: string
  bid: number
  ask: number
  high: number
  low: number
  volume: number
  timestamp: string
  source: string
}

interface ErrorData {
  error: true
  message: string
  symbol: string
}

export async function getRealPrice(symbol: string): Promise<PriceData | ErrorData> {
  return new Promise((resolve, reject) => {
    // Use the absolute path to the virtual environment python
    const pythonCmd = '/Users/anchalsharma/Downloads/project 5/.venv/bin/python3'

    // Path to Python script (relative to this file)
    const pythonScript = path.join(__dirname, '../../scripts/fetch_yf_prices.py')

    // Spawn Python process
    const child = spawn(pythonCmd, [pythonScript, symbol], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.dirname(pythonScript)
    })

    let output = ''
    let error = ''

    child.stdout.on('data', (data) => {
      output += data.toString()
    })

    child.stderr.on('data', (data) => {
      error += data.toString()
    })

    child.on('close', (code) => {
      if (code === 0 && output.trim()) {
        try {
          const result = JSON.parse(output.trim())

          if (result.success) {
            // Return the real YFinance data
            resolve({
              symbol,
              bid: result.bid,
              ask: result.ask,
              high: result.high,
              low: result.low,
              volume: result.volume,
              timestamp: result.timestamp,
              source: result.source
            })
          } else {
            // No real data available, return error
            resolve({
              error: true,
              message: result.error || 'No real-time data available',
              symbol
            } as ErrorData)
          }
        } catch (e) {
          resolve({
            error: true,
            message: `JSON parse error: ${(e as Error).message}`,
            symbol
          } as ErrorData)
        }
      } else {
        resolve({
          error: true,
          message: `Process failed: ${error || 'Unknown error'}`,
          symbol
        } as ErrorData)
      }
    })

    child.on('error', (err) => {
      resolve({
        error: true,
        message: `Spawn error: ${err.message}`,
        symbol
      } as ErrorData)
    })

    // 10 second timeout
    setTimeout(() => {
      child.kill()
      resolve({
        error: true,
        message: 'Timeout: Could not fetch real-time price',
        symbol
      } as ErrorData)
    }, 10000)
  })
}
