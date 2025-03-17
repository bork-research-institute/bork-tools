export interface MarketStat {
  symbol: string;
  name: string;
  price: string;
  change24h: string;
  isPositive: boolean;
  rsi: number;
  macd: number;
  volume: string;
  spread: string;
  spreadPercentage: string;
  liquidity: string;
}

export interface MarketMetricsData {
  name?: string;
  price?: number;
  change24h?: number;
  volume?: number;
  technicalAnalysis?: {
    indicators?: {
      rsi14?: number;
      macd?: {
        macdLine?: number;
      };
    };
  };
  orderBook?: {
    spread?: number;
    spreadPercentage?: number;
  };
  liquidity?: {
    tvl?: number;
  };
}
