import type {
  MarketMetrics,
  NetworkMetrics,
  NewsItem,
  PriceData,
  SocialMetrics,
  Tweet,
  UnlockData,
} from '../types/metrics';

export const mockMarketMetrics: MarketMetrics = {
  technicalAnalysis: {
    latestCandle: {
      timestamp: Date.now(),
      open: '84150',
      high: '84500',
      low: '83900',
      close: '84197',
      volume: '1250000',
    },
    indicators: {
      sma24h: 83950,
      ema24h: 84100,
      vwap24h: 84050,
      rsi14: 67.5,
      bollingerBands: {
        upper: 84500,
        middle: 84000,
        lower: 83500,
      },
      macd: {
        macdLine: 150,
        signalLine: 100,
        histogram: 50,
      },
      atr14: 450,
      stochastic: {
        k: 75,
        d: 65,
      },
      adx14: 28,
    },
  },
  orderBook: {
    spread: 25,
    spreadPercentage: 0.03,
    bidDepth: 2500000,
    askDepth: 2300000,
  },
  liquidity: {
    tvl: 125000000,
    slippage: [
      { price: 84000, slippagePercentage: 0.1 },
      { price: 83500, slippagePercentage: 0.25 },
    ],
  },
};

export const mockNetworkMetrics: NetworkMetrics = {
  transactions: {
    daily: 125000,
    activeAddresses: 45000,
    avgGasFee: '0.0025',
  },
  staking: {
    totalStaked: '450000000',
    stakingRate: 65.4,
    activeValidators: 156,
  },
  governance: {
    activeProposals: 3,
    votingParticipation: 78.5,
  },
};

export const mockSocialMetrics: SocialMetrics = {
  sentiment: {
    overall: 'Positive',
    confidence: 85,
  },
  engagement: {
    activeUsers: 2400,
    dailyPosts: 12500,
    avgInteractions: 45,
  },
  contentQuality: {
    qualityScore: 92,
    spamRate: 0.5,
    authenticity: 88,
  },
};

export const newsItems: NewsItem[] = [
  {
    source: 'DLNews',
    timeAgo: '8h 29m ago',
    category: 'Investment Opportunities',
    title:
      'US investors missed out on billions in airdrops, according to crypto VC firm',
    description:
      'Crypto companies have attempted to prevent US investors from claiming airdropped tokens. One VC tried to calculate how much they lost.',
    sentiment: 'negative',
  },
  {
    source: 'CoinDesk',
    timeAgo: '12h 30m ago',
    category: 'Blockchain Development',
    title:
      'Cardano: Deep Dive on the Trump Reserve Token Whose Blockchain Ignores TVL',
    description:
      'The Cardano Foundation measures growth in real-world use cases and not TVL.',
    sentiment: 'neutral',
  },
];

export const tweets: Tweet[] = [
  {
    source: 'The Block',
    timeAgo: '9h 37m ago',
    content: "VanEck looks to get SEC's greenlight for first AVAX ETF",
    sentiment: 'positive',
  },
  {
    source: 'The Block',
    timeAgo: '10h 6m ago',
    content:
      "Federal court orders crypto personality 'TJ Stone' to serve 45 months in prison and to...",
    sentiment: 'negative',
  },
];

export const prices: PriceData[] = [
  {
    rank: 1,
    name: 'Bitcoin',
    symbol: 'BTC',
    price: '$84,131',
    change24h: '+2.62%',
    isPositive: true,
  },
  {
    rank: 2,
    name: 'Ethereum',
    symbol: 'ETH',
    price: '$1,926.57',
    change24h: '+1.73%',
    isPositive: true,
  },
  {
    rank: 3,
    name: 'Tether',
    symbol: 'USDT',
    price: '$0.999998',
    change24h: '+0.02%',
    isPositive: true,
  },
];

export const unlocks: UnlockData[] = [
  {
    name: 'CYBER',
    timeLeft: '0h 4m',
    price: '$1.26',
    change: '+0.80%',
    isPositive: true,
    value: '$1.1M',
  },
  {
    name: 'Perpetual Protocol',
    timeLeft: '7h 40m',
    price: '$0.354',
    change: '+1.27%',
    isPositive: true,
    value: '$232.6k',
  },
  {
    name: 'Celestia',
    timeLeft: '12h 41m',
    price: '$3.52',
    change: '-1.67%',
    isPositive: false,
    value: '$3.3M',
  },
];

export interface TrendingTweet {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
  metrics: {
    likes: number;
    retweets: number;
    comments: number;
  };
  engagementScore?: number;
}

export const mockTrendingTweets: TrendingTweet[] = [
  {
    id: '1',
    authorId: '123',
    authorName: 'Vitalik Buterin',
    authorUsername: 'vitalikbuterin',
    authorAvatar:
      'https://pbs.twimg.com/profile_images/977496875887558661/L86xyLF4_400x400.jpg',
    content:
      'Layer 2 rollups are the future of Ethereum scaling. The ecosystem is growing rapidly and I am excited to see what is next! 🚀',
    createdAt: '2024-03-15T10:00:00Z',
    metrics: {
      likes: 15000,
      retweets: 3000,
      comments: 1200,
    },
  },
  {
    id: '2',
    authorId: '456',
    authorName: 'Ethereum',
    authorUsername: 'ethereum',
    authorAvatar:
      'https://pbs.twimg.com/profile_images/1641876585744093184/4hAYh6YB_400x400.jpg',
    content:
      'The Dencun upgrade is now live on mainnet! This brings proto-danksharding (EIP-4844) to Ethereum, significantly reducing L2 transaction costs. 🎉',
    createdAt: '2024-03-14T15:30:00Z',
    metrics: {
      likes: 12000,
      retweets: 2500,
      comments: 800,
    },
  },
  {
    id: '3',
    authorId: '789',
    authorName: 'Ethereum Foundation',
    authorUsername: 'EF_Events',
    authorAvatar:
      'https://pbs.twimg.com/profile_images/1240306124837203968/65z5oYhT_400x400.jpg',
    content:
      "Join us for the next Ethereum Foundation DevCon! Early bird tickets now available. Don't miss out on the biggest Ethereum developer conference. 🎟️",
    createdAt: '2024-03-13T18:45:00Z',
    metrics: {
      likes: 8000,
      retweets: 1500,
      comments: 600,
    },
  },
];
