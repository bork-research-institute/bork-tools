import type { TweetWithAnalysis } from '../tweets-analysis';

export interface LiquidityMetrics {
  burnedLpPercentage?: number;
  totalLiquidity: number;
  lpHolderCount?: number;
  lpProgramId?: string;
  openTime?: string;
  volumeMetrics?: VolumeMetrics;
}

export interface VolumeMetrics {
  volume24h: number;
  volumeChange: number;
  isVolumeIncreasing: boolean;
}

export interface TokenPriceDetails {
  price: number;
  buyPrice: number;
  buyImpact: {
    '10': number;
    '100': number;
  };
  sellPrice: number;
  sellImpact: {
    '10': number | null;
    '100': number | null;
    '1000': number | null;
  };
  lastTradeAt: string;
}

export interface TokenData {
  name?: string;
  ticker?: string;
  holderCount: number;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  isMintable: boolean;
  isFreezable: boolean;
  supply: number;
  decimals: number;
  isInvalidToken?: boolean;
  liquidityMetrics?: LiquidityMetrics;
  marketCap?: number;
  priceInfo?: TokenPriceDetails;
  description?: string;
  icon?: string;
  links?: Array<{
    type?: string;
    label?: string;
    url: string;
  }>;
  timestamp: string;
  bundleAnalysis?: BundleAnalysis[];
}

export interface Tweet {
  id: string;
  timestamp: number;
  likes: number;
  replies: number;
  retweets: number;
  views: number;
  bookmarkCount?: number;
  analysis?: {
    relevance: number;
    clarity: number;
    authenticity: number;
    value_add: number;
  };
}

export interface TokenSnapshot {
  id: string;
  token_address: string;
  timestamp: string;
  created_at: string;
  data: TokenData;
  tweet_ids?: string[];
}

export interface TokenWithEngagement extends TokenSnapshot {
  engagement?: {
    likes: number;
    replies: number;
    retweets: number;
    views: number;
    tweets?: TweetWithAnalysis[];
  };
}

interface BundleTransaction {
  signature: string;
  slot: number;
  timestamp: number;
  confirmationStatus: string;
  error?: string;
  description: string;
  type: string;
  fee: number;
  feePayer: string;
  nativeTransfers: {
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }[];
  tokenTransfers: {
    fromUserAccount: string;
    toUserAccount: string;
    fromTokenAccount: string;
    toTokenAccount: string;
    tokenAmount: number;
    mint: string;
  }[];
  accountData: {
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: {
      userAccount: string;
      tokenAccount: string;
      mint: string;
      rawTokenAmount: {
        tokenAmount: string;
        decimals: number;
      };
    }[];
  }[];
}

interface BundleAnalysis {
  bundleId: string;
  transactions: BundleTransaction[];
  netTokenMovements: {
    [tokenAddress: string]: {
      amount: number;
      direction: 'in' | 'out';
    };
  };
}
