// Shared mock positions and trades stores for demo accounts
export const mockPositionsStore: Record<string, any[]> = {}
export const mockTradesStore: Record<string, any[]> = {}

// Persistence files for mock data
const TRADES_FILE = './.mock-trades.json'
const BALANCE_FILE = './.mock-balance.json'

// Mock account balance storage
export const mockBalances: Record<string, number> = {}

// Load persisted trades from file
function loadPersistedTrades() {
  try {
    const fs = require('fs')
    if (fs.existsSync(TRADES_FILE)) {
      const data = fs.readFileSync(TRADES_FILE, 'utf8')
      const parsed = JSON.parse(data)
      Object.assign(mockTradesStore, parsed)
      console.log('Loaded persisted trades from file:', Object.keys(mockTradesStore).length, 'accounts')
    }
  } catch (error) {
    console.log('Could not load persisted trades:', (error as Error)?.message || String(error))
  }
}

// Save trades to file for persistence across server restarts
function savePersistedTrades() {
  try {
    const fs = require('fs')
    fs.writeFileSync(TRADES_FILE, JSON.stringify(mockTradesStore, null, 2))
    console.log('Saved persisted trades to file')
  } catch (error) {
    console.log('Could not save persisted trades:', error instanceof Error ? error.message : String(error))
  }
}

// Load persisted balance from file
function loadPersistedBalance() {
  try {
    const fs = require('fs')
    if (fs.existsSync(BALANCE_FILE)) {
      const data = fs.readFileSync(BALANCE_FILE, 'utf8')
      const parsed = JSON.parse(data)
      Object.assign(mockBalances, parsed)
      console.log('Loaded persisted balances from file:', Object.keys(mockBalances).length, 'accounts')
    }
  } catch (error) {
    console.log('Could not load persisted balances:', (error as Error)?.message || String(error))
  }
}

// Save balances to file for persistence across server restarts
function savePersistedBalance() {
  try {
    const fs = require('fs')
    fs.writeFileSync(BALANCE_FILE, JSON.stringify(mockBalances, null, 2))
    console.log('Saved persisted balances to file')
  } catch (error) {
    console.log('Could not save persisted balances:', (error as Error)?.message || String(error))
  }
}

// Initialize on module load
loadPersistedTrades()
loadPersistedBalance()

// Add a mock position to the store
export function addMockPosition(accountId: string, position: any) {
  if (!mockPositionsStore[accountId]) {
    mockPositionsStore[accountId] = []
  }
  mockPositionsStore[accountId].push(position)
  console.log(`Added mock position ${position.id} for account ${accountId}`)
}

// Get mock positions for an account
export function getMockPositions(accountId: string): any[] {
  return mockPositionsStore[accountId] || []
}

// Remove a mock position and add to trades (for closing positions)
export function closeMockPosition(accountId: string, positionId: string): any | null {
  if (!mockPositionsStore[accountId]) return null

  // Find and remove the position
  const positionIndex = mockPositionsStore[accountId].findIndex(p => p.id === positionId)
  if (positionIndex === -1) return null

  const closedPosition = mockPositionsStore[accountId][positionIndex]
  mockPositionsStore[accountId].splice(positionIndex, 1)

  // Add to trades store
  if (!mockTradesStore[accountId]) {
    mockTradesStore[accountId] = []
  }
  mockTradesStore[accountId].push(closedPosition)

  // Persist to file immediately
  savePersistedTrades()

  console.log(`Closed mock position ${positionId} for account ${accountId}`)
  return closedPosition
}

// Get mock trades for an account
export function getMockTrades(accountId: string): any[] {
  return mockTradesStore[accountId] || []
}

// Get mock balance for an account
export function getMockBalance(accountId: string): number {
  return mockBalances[accountId] || 10000 // Default to 10000 if not found
}

// Get accumulated balance for an account (direct balance from storage)
export function getAccumulatedBalance(accountId: string): number {
  // Return stored balance or default to 10000
  return mockBalances[accountId] || 10000
}

// Set/update mock balance for an account
export function setMockBalance(accountId: string, balance: number) {
  mockBalances[accountId] = balance
  savePersistedBalance() // Persist immediately
  console.log(`Updated balance for ${accountId} to ${balance}`)
}
