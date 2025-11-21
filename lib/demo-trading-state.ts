let demoPositions: any[] = []
let demoTrades: any[] = []

export function getDemoPositions() {
  return demoPositions
}

export function addDemoPosition(position: any) {
  demoPositions.push(position)
  return position
}

export function removeDemoPosition(id: string) {
  const index = demoPositions.findIndex(p => p.id === id)
  if (index > -1) {
    const position = demoPositions[index]
    demoPositions.splice(index, 1)
    return position
  }
  return null
}

export function updateDemoPosition(id: string, updates: any) {
  const index = demoPositions.findIndex(p => p.id === id)
  if (index > -1) {
    demoPositions[index] = { ...demoPositions[index], ...updates }
    return demoPositions[index]
  }
  return null
}

export function getDemoTrades() {
  return demoTrades
}

export function addDemoTrade(trade: any) {
  demoTrades.push(trade)
  return trade
}

export function clearDemoState() {
  demoPositions = []
  demoTrades = []
}
