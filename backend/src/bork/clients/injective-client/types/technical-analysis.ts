export interface TechnicalAnalysis {
  latestCandle: {
    timestamp: number;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
  };
  indicators: {
    sma24h: number;
    ema24h: number;
    vwap24h: number;
    rsi14: number;
    bollingerBands: {
      upper: number;
      middle: number;
      lower: number;
    };
    macd: {
      macdLine: number;
      signalLine: number;
      histogram: number;
    };
    atr14: number;
    stochastic: {
      k: number;
      d: number;
    };
    adx14: number;
  };
}

export interface OrderBookAnalysis {
  spread: number;
  spreadPercentage: number;
  bidDepth: number;
  askDepth: number;
  bidDensity: number;
  askDensity: number;
  topBids: Array<{ price: string; quantity: string }>;
  topAsks: Array<{ price: string; quantity: string }>;
}

export interface LiquidityAnalysis {
  tvl: number;
  poolComposition: {
    token1: { symbol: string; amount: number; percentage: number };
    token2: { symbol: string; amount: number; percentage: number };
  };
  slippage: {
    price: number;
    slippagePercentage: number;
  }[];
}

export interface DerivativesMetrics {
  fundingRate: {
    current: number;
    timestamp: number;
  };
  openInterest: {
    total: number;
    long: number;
    short: number;
    longShortRatio: number;
  };
}

export interface MarketAnalysis {
  marketId: string;
  ticker: string;
  orderBook: OrderBookAnalysis;
  liquidity: LiquidityAnalysis | null;
  derivativesMetrics: DerivativesMetrics | null;
  recentTrades: Array<{
    price: string;
    quantity: string;
    direction: string;
  }>;
  technicalAnalysis: TechnicalAnalysis | null;
  timeframe: string;
}
