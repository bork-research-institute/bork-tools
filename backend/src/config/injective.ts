import { TimeResolution } from '../plugins/injective-client/types/market-history';

// Market Analysis Intervals (in milliseconds)
export const MARKET_ANALYSIS_INTERVALS = {
  MINUTE: 60000,
  FIVE_MINUTES: 300000,
  FIFTEEN_MINUTES: 900000,
  THIRTY_MINUTES: 1800000,
  HOUR: 3600000,
  FOUR_HOURS: 14400000,
  DAY: 86400000,
} as const;

// Default market analysis configuration
export const DEFAULT_MARKET_ANALYSIS_CONFIG = {
  type: 'spot' as const,
  resolution: TimeResolution.Hour,
  countback: 24, // Number of historical data points to fetch
  limit: 10, // Number of top markets to analyze
  // Technical indicator periods
  sma: 24, // Simple Moving Average period
  ema: 24, // Exponential Moving Average period
  rsi: 14, // Relative Strength Index period
  bollinger: {
    period: 20,
    stdDev: 2, // Standard deviation multiplier
  },
  macd: {
    fast: 12, // Fast EMA period
    slow: 26, // Slow EMA period
    signal: 9, // Signal line period
  },
  atr: 14, // Average True Range period
  stochastic: {
    k: 14, // %K period
    d: 3, // %D period
  },
  adx: 14, // Average Directional Index period
} as const;

// Default interval for market analysis (1 hour)
export const DEFAULT_MARKET_ANALYSIS_INTERVAL = MARKET_ANALYSIS_INTERVALS.HOUR;

// Market depth configuration
export const MARKET_DEPTH_CONFIG = {
  DEFAULT_DEPTH: 20, // Number of orders to analyze in order book
  MAX_DEPTH: 100, // Maximum number of orders to fetch
} as const;

// Network configuration
export const NETWORK_CONFIG = {
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // milliseconds
  TIMEOUT: 30000, // milliseconds
} as const;

// Database configuration
export const DATABASE_CONFIG = {
  TABLE_NAMES: {
    MARKET_ANALYSIS: 'market_analysis',
  },
  BATCH_SIZE: 100, // Number of records to insert/update in one batch
  MAX_RETENTION_DAYS: 30, // Number of days to keep historical data
} as const;
