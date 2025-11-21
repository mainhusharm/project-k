#!/usr/bin/env node
/**
 * Node.js wrapper to call Python YFinance script
 * Returns ONLY real YFinance prices (no fallbacks)
 */

const { spawn } = require('child_process')
const path = require('path')

function getRealPrice(symbol) {
  return new Promise((resolve, reject) => {
    // Path to Python script
    const pythonScript = path.join(__dirname, 'fetch_yf_prices.py')
    const pythonPath = '/Users/anchalsharma/Downloads/project 5/.venv/bin/python3'

    // Spawn Python process
    const child = spawn(pythonPath, [pythonScript, symbol], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname
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
            })
          }
        } catch (e) {
          resolve({
            error: true,
            message: `JSON parse error: ${e.message}`,
            symbol
          })
        }
      } else {
        resolve({
          error: true,
          message: `Process failed: ${error || 'Unknown error'}`,
          symbol
        })
      }
    })

    child.on('error', (err) => {
      resolve({
        error: true,
        message: `Spawn error: ${err.message}`,
        symbol
      })
    })

    // 10 second timeout
    setTimeout(() => {
      child.kill()
      resolve({
        error: true,
        message: 'Timeout: Could not fetch real-time price',
        symbol
      })
    }, 10000)
  })
}

async function main() {
  const symbol = process.argv[2]

  if (!symbol) {
    console.error('Usage: node get_price.js <SYMBOL>')
    process.exit(1)
  }

  try {
    const result = await getRealPrice(symbol)
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error(JSON.stringify({
      error: true,
      message: error.message,
      symbol
    }))
  }
}

if (require.main === module) {
  main()
}

module.exports = { getRealPrice }
