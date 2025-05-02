export interface LiquidityMetrics {
  totalLiquidity: number;
  burnedLpPercentage?: number;
  lpHolderCount?: number;
  lpProgramId?: string;
  openTime?: string;
  volumeMetrics?: {
    volume24h: number;
    volumeChange?: number;
    isVolumeIncreasing?: boolean;
  };
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
  };
}
