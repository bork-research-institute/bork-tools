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
