import type {
  BundlerMetrics,
  MarketMetrics,
  NetworkMetrics,
  NewsItem,
  PriceData,
  SocialMetrics,
  TokenHolder,
  TopicMindshare,
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

export interface UserRelationship {
  source_username: string;
  target_username: string;
  mention_count: number;
}

export const mockUserRelationships: UserRelationship[] = [
  { source_username: 'alice', target_username: 'bob', mention_count: 45 },
  { source_username: 'bob', target_username: 'charlie', mention_count: 38 },
  { source_username: 'charlie', target_username: 'david', mention_count: 32 },
  { source_username: 'david', target_username: 'alice', mention_count: 28 },
  { source_username: 'eve', target_username: 'alice', mention_count: 25 },
  { source_username: 'frank', target_username: 'bob', mention_count: 22 },
  { source_username: 'grace', target_username: 'alice', mention_count: 20 },
  { source_username: 'henry', target_username: 'charlie', mention_count: 18 },
  { source_username: 'ivy', target_username: 'david', mention_count: 16 },
  { source_username: 'jack', target_username: 'eve', mention_count: 15 },
  { source_username: 'kelly', target_username: 'frank', mention_count: 14 },
  { source_username: 'liam', target_username: 'grace', mention_count: 13 },
  { source_username: 'mia', target_username: 'henry', mention_count: 12 },
  { source_username: 'noah', target_username: 'ivy', mention_count: 11 },
  { source_username: 'olivia', target_username: 'jack', mention_count: 10 },
  { source_username: 'peter', target_username: 'kelly', mention_count: 9 },
  { source_username: 'quinn', target_username: 'liam', mention_count: 8 },
  { source_username: 'rachel', target_username: 'mia', mention_count: 7 },
  { source_username: 'sam', target_username: 'noah', mention_count: 6 },
  { source_username: 'tara', target_username: 'olivia', mention_count: 5 },
  { source_username: 'uma', target_username: 'peter', mention_count: 4 },
  { source_username: 'victor', target_username: 'quinn', mention_count: 3 },
  { source_username: 'wendy', target_username: 'rachel', mention_count: 2 },
  { source_username: 'xander', target_username: 'sam', mention_count: 1 },
  { source_username: 'yara', target_username: 'tara', mention_count: 1 },
];

export const mockMindshareData: TopicMindshare[] = [
  { topic: 'DeFi', weight: 85, impactScore: 92 },
  { topic: 'NFTs', weight: 72, impactScore: 78 },
  { topic: 'Layer 2', weight: 68, impactScore: 88 },
  { topic: 'Gaming', weight: 65, impactScore: 75 },
  { topic: 'DAOs', weight: 58, impactScore: 82 },
  { topic: 'Privacy', weight: 52, impactScore: 85 },
  { topic: 'Staking', weight: 48, impactScore: 72 },
  { topic: 'Governance', weight: 45, impactScore: 80 },
  { topic: 'Interoperability', weight: 42, impactScore: 86 },
  { topic: 'Oracles', weight: 38, impactScore: 78 },
  { topic: 'MEV', weight: 35, impactScore: 70 },
  { topic: 'Tokenomics', weight: 32, impactScore: 76 },
  { topic: 'Security', weight: 30, impactScore: 95 },
  { topic: 'Scaling', weight: 28, impactScore: 88 },
  { topic: 'Identity', weight: 25, impactScore: 82 },
  { topic: 'Bridges', weight: 22, impactScore: 75 },
  { topic: 'Regulation', weight: 20, impactScore: 90 },
  { topic: 'Sustainability', weight: 18, impactScore: 72 },
  { topic: 'Social', weight: 15, impactScore: 65 },
  { topic: 'Infrastructure', weight: 12, impactScore: 85 },
];

export interface KaitoUser {
  username: string;
  avatar: string;
  yaps: number;
  rank: number;
}

export const mockKaitoLeaderboard: KaitoUser[] = [
  {
    username: '0xGabey',
    avatar: 'https://example.com/avatar1.jpg',
    yaps: 389,
    rank: 1,
  },
  {
    username: 'zerebro',
    avatar: 'https://example.com/avatar2.jpg',
    yaps: 317,
    rank: 2,
  },
  {
    username: 'ansem',
    avatar: 'https://example.com/avatar3.jpg',
    yaps: 306,
    rank: 3,
  },
  {
    username: 'Hustle',
    avatar: 'https://example.com/avatar4.jpg',
    yaps: 226,
    rank: 4,
  },
  {
    username: 'Venice',
    avatar: 'https://example.com/avatar5.jpg',
    yaps: 195,
    rank: 5,
  },
  {
    username: 'Send...',
    avatar: 'https://example.com/avatar6.jpg',
    yaps: 164,
    rank: 6,
  },
  {
    username: 'Satan',
    avatar: 'https://example.com/avatar7.jpg',
    yaps: 143,
    rank: 7,
  },
  {
    username: 'norm...',
    avatar: 'https://example.com/avatar8.jpg',
    yaps: 129,
    rank: 8,
  },
  {
    username: 'Agen...',
    avatar: 'https://example.com/avatar9.jpg',
    yaps: 116,
    rank: 9,
  },
  {
    username: 'XAVI',
    avatar: 'https://example.com/avatar10.jpg',
    yaps: 98,
    rank: 10,
  },
];

export const mockTokenHolders: TokenHolder[] = [
  {
    address: '0x1234...5678',
    balance: 1500000,
    percentage: 15.0,
    type: 'whale',
    lastActivity: '2h ago',
  },
  {
    address: '0x2345...6789',
    balance: 800000,
    percentage: 8.0,
    type: 'institution',
    lastActivity: '1d ago',
  },
  {
    address: '0x3456...7890',
    balance: 600000,
    percentage: 6.0,
    type: 'contract',
    lastActivity: '5h ago',
  },
  {
    address: '0x4567...8901',
    balance: 400000,
    percentage: 4.0,
    type: 'whale',
    lastActivity: '3h ago',
  },
  {
    address: '0x5678...9012',
    balance: 300000,
    percentage: 3.0,
    type: 'institution',
    lastActivity: '12h ago',
  },
  {
    address: '0x6789...0123',
    balance: 250000,
    percentage: 2.5,
    type: 'retail',
    lastActivity: '1h ago',
  },
  {
    address: '0x7890...1234',
    balance: 200000,
    percentage: 2.0,
    type: 'retail',
    lastActivity: '4h ago',
  },
  {
    address: '0x8901...2345',
    balance: 150000,
    percentage: 1.5,
    type: 'contract',
    lastActivity: '2d ago',
  },
];

export const mockBundlerMetrics: BundlerMetrics[] = [
  {
    bundler: 'Titan',
    successRate: 98.5,
    totalTxs: 1250000,
    avgGasPrice: 25.4,
    revertRate: 1.5,
    mevExtracted: 45.2,
    marketShare: 35.0,
  },
  {
    bundler: 'BloxRoute',
    successRate: 97.8,
    totalTxs: 980000,
    avgGasPrice: 24.8,
    revertRate: 2.2,
    mevExtracted: 38.6,
    marketShare: 28.0,
  },
  {
    bundler: 'BundleBear',
    successRate: 96.9,
    totalTxs: 750000,
    avgGasPrice: 23.9,
    revertRate: 3.1,
    mevExtracted: 32.4,
    marketShare: 22.0,
  },
  {
    bundler: 'MEVBoost',
    successRate: 95.5,
    totalTxs: 420000,
    avgGasPrice: 22.7,
    revertRate: 4.5,
    mevExtracted: 28.1,
    marketShare: 15.0,
  },
];
