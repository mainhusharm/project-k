/**
 * Simulated Market Data Service for Demo Trading
 * This provides realistic forex and crypto prices for the trading platform
 */

type SymbolType = 'forex' | 'crypto' | 'commodity' | 'index';

interface SymbolConfig {
  symbol: string;
  type: SymbolType;
  basePrice: number;
  spread: number;
  volatility: number;
  decimalPlaces: number;
}

const SYMBOLS: SymbolConfig[] = [
  // Major Forex Pairs
  { symbol: 'EURUSD', type: 'forex', basePrice: 1.0850, spread: 0.0002, volatility: 0.001, decimalPlaces: 5 },
  { symbol: 'GBPUSD', type: 'forex', basePrice: 1.2680, spread: 0.0002, volatility: 0.0012, decimalPlaces: 5 },
  { symbol: 'USDJPY', type: 'forex', basePrice: 148.45, spread: 0.02, volatility: 0.002, decimalPlaces: 2 },
  { symbol: 'AUDUSD', type: 'forex', basePrice: 0.6495, spread: 0.0002, volatility: 0.0008, decimalPlaces: 5 },
  { symbol: 'USDCAD', type: 'forex', basePrice: 1.3595, spread: 0.0002, volatility: 0.0006, decimalPlaces: 5 },
  { symbol: 'USDCHF', type: 'forex', basePrice: 0.8845, spread: 0.0002, volatility: 0.001, decimalPlaces: 5 },
  { symbol: 'NZDUSD', type: 'forex', basePrice: 0.5845, spread: 0.0002, volatility: 0.0009, decimalPlaces: 5 },

  // Commodities
  { symbol: 'GOLD', type: 'commodity', basePrice: 2035.50, spread: 0.50, volatility: 0.002, decimalPlaces: 2 },
  { symbol: 'SILVER', type: 'commodity', basePrice: 23.45, spread: 0.05, volatility: 0.003, decimalPlaces: 2 },
  { symbol: 'OIL', type: 'commodity', basePrice: 78.25, spread: 0.05, volatility: 0.004, decimalPlaces: 2 },

  // Cryptocurrencies
  { symbol: 'BTCUSD', type: 'crypto', basePrice: 42800.00, spread: 50.00, volatility: 0.008, decimalPlaces: 2 },
  { symbol: 'ETHUSD', type: 'crypto', basePrice: 2250.00, spread: 5.00, volatility: 0.012, decimalPlaces: 2 },

  // Indices
  { symbol: 'SPX500', type: 'index', basePrice: 4950.00, spread: 0.50, volatility: 0.004, decimalPlaces: 2 },
  { symbol: 'NASDAQ', type: 'index', basePrice: 15550.00, spread: 1.00, volatility: 0.005, decimalPlaces: 2 },
];

class SimulatedMarketData {
  private prices: Map<string, { bid: number; ask: number; high: number; low: number; timestamp: Date }> = new Map();
  private listeners: Set<(symbol: string, price: any) => void> = new Set();
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    // Initialize prices
    SYMBOLS.forEach(config => {
      const spread = config.spread;
      const midPrice = config.basePrice;
      const halfSpread = spread / 2;

      this.prices.set(config.symbol, {
        bid: Math.round((midPrice - halfSpread) * Math.pow(10, config.decimalPlaces)) / Math.pow(10, config.decimalPlaces),
        ask: Math.round((midPrice + halfSpread) * Math.pow(10, config.decimalPlaces)) / Math.pow(10, config.decimalPlaces),
        high: midPrice,
        low: midPrice,
        timestamp: new Date(),
      });
    });
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('🟢 Simulated Market Data Service Started');

    // Update prices every 2 seconds
    this.interval = setInterval(() => {
      this.updatePrices();
    }, 2000);
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    console.log('🔴 Simulated Market Data Service Stopped');
  }

  private updatePrices() {
    SYMBOLS.forEach(config => {
      const current = this.prices.get(config.symbol)!;
      const volatility = config.volatility;
      const spread = config.spread;

      // Generate random price movement
      const change = (Math.random() - 0.5) * 2 * volatility * current.ask;
      const newMidPrice = current.ask + change;

      // Ensure price stays within reasonable bounds (±5% from base)
      const maxDeviation = config.basePrice * 0.05;
      const clampedPrice = Math.max(
        config.basePrice - maxDeviation,
        Math.min(config.basePrice + maxDeviation, newMidPrice)
      );

      const halfSpread = spread / 2;
      const newBid = Math.round((clampedPrice - halfSpread) * Math.pow(10, config.decimalPlaces)) / Math.pow(10, config.decimalPlaces);
      const newAsk = Math.round((clampedPrice + halfSpread) * Math.pow(10, config.decimalPlaces)) / Math.pow(10, config.decimalPlaces);

      // Update high/low
      let high = Math.max(current.high, newAsk);
      let low = Math.min(current.low, newBid);

      const updatedPrice = {
        bid: newBid,
        ask: newAsk,
        high,
        low,
        timestamp: new Date(),
      };

      this.prices.set(config.symbol, updatedPrice);

      // Notify listeners
      this.listeners.forEach(listener => {
        listener(config.symbol, updatedPrice);
      });
    });
  }

  getSymbolPrice(symbol: string) {
    const price = this.prices.get(symbol);
    if (!price) {
      // Return fallback price
      const config = SYMBOLS.find(s => s.symbol === symbol);
      if (config) {
        return {
          bid: config.basePrice - config.spread / 2,
          ask: config.basePrice + config.spread / 2,
          high: config.basePrice,
          low: config.basePrice,
          timestamp: new Date(),
        };
      }
      throw new Error(`Symbol ${symbol} not found`);
    }
    return price;
  }

  getAllSymbols() {
    return SYMBOLS.map(config => config.symbol);
  }

  onPriceUpdate(callback: (symbol: string, price: any) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Get symbol information
  getSymbolInfo(symbol: string) {
    return SYMBOLS.find(s => s.symbol === symbol);
  }

  // Generate historical data for charts
  getHistoricalData(symbol: string, hours: number = 24) {
    const config = SYMBOLS.find(s => s.symbol === symbol);
    if (!config) return [];

    const data = [];
    const now = new Date();
    const points = hours * 30; // 2-minute intervals

    for (let i = points; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 2 * 60 * 1000);
      const volatility = config.volatility;

      // Add trend and noise
      const trend = Math.sin((points - i) / (points / (2 * Math.PI))) * config.basePrice * 0.02;
      const noise = (Math.random() - 0.5) * 2 * volatility * config.basePrice;
      const price = config.basePrice + trend + noise;

      const spread = config.spread;
      const bid = price - spread / 2;
      const ask = price + spread / 2;

      data.push({
        time: time.toLocaleTimeString(),
        price: (bid + ask) / 2,
        bid: Math.round(bid * Math.pow(10, config.decimalPlaces)) / Math.pow(10, config.decimalPlaces),
        ask: Math.round(ask * Math.pow(10, config.decimalPlaces)) / Math.pow(10, config.decimalPlaces),
      });
    }

    return data;
  }
}

// Singleton instance
const marketDataService = new SimulatedMarketData();

export { marketDataService, SYMBOLS };
