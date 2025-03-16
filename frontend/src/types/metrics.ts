export interface NewsItem {
  source: string;
  timeAgo: string;
  category: string;
  title: string;
  description: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface Tweet {
  source: string;
  timeAgo: string;
  content: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface PriceData {
  rank: number;
  name: string;
  symbol: string;
  price: string;
  change24h: string;
  isPositive: boolean;
}

export interface UnlockData {
  name: string;
  timeLeft: string;
  price: string;
  change: string;
  isPositive: boolean;
  value: string;
}

export interface MarketMetrics {
  technicalAnalysis: {
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
  };
  orderBook: {
    spread: number;
    spreadPercentage: number;
    bidDepth: number;
    askDepth: number;
  };
  liquidity: {
    tvl: number;
    slippage: Array<{
      price: number;
      slippagePercentage: number;
    }>;
  };
}

export interface NetworkMetrics {
  transactions: {
    daily: number;
    activeAddresses: number;
    avgGasFee: string;
  };
  staking: {
    totalStaked: string;
    stakingRate: number;
    activeValidators: number;
  };
  governance: {
    activeProposals: number;
    votingParticipation: number;
  };
}

export interface SocialMetrics {
  sentiment: {
    overall: string;
    confidence: number;
  };
  engagement: {
    activeUsers: number;
    dailyPosts: number;
    avgInteractions: number;
  };
  contentQuality: {
    qualityScore: number;
    spamRate: number;
    authenticity: number;
  };
}

export interface TopicMindshare {
  topic: string;
  weight: number; // How often the topic is mentioned
  impactScore: number; // How much influence/impact the topic has
}
