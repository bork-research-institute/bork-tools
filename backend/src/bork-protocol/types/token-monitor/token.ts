export interface LiquidityMetrics {
  burnedLpPercentage: number;
  totalLiquidity: number;
  lpHolderCount: number;
  lpProgramId: string;
  openTime: string;
  volumeMetrics?: VolumeMetrics;
}

export interface PoolInfo {
  lpMint: string;
  totalLpSupply: number;
  burnedLpAmount: number;
  openTime: string;
}

export interface VolumeMetrics {
  volume24h: number;
  volumeChange: number; // percentage change
  isVolumeIncreasing: boolean;
}

export interface TokenLink {
  type?: string;
  label?: string;
  url: string; // URI
}

export interface TokenProfile {
  url: string; // URI
  chainId: string;
  tokenAddress: string;
  icon?: string; // URI
  header?: string; // URI
  description?: string;
  links?: TokenLink[];
}

export interface ExtendedTokenProfile extends TokenProfile {
  amount: number;
  totalAmount: number;
}

export interface TokenMetrics {
  holderCount: number;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  isMintable: boolean;
  isFreezable: boolean;
  supply: number;
  decimals: number;
  isInvalidToken?: boolean;
  liquidityMetrics?: LiquidityMetrics;
  volumeMetrics?: VolumeMetrics;
  marketCap?: number;
  priceInfo?: TokenPriceDetails;
}

export interface EnrichedToken extends TokenProfile {
  metrics: TokenMetrics;
}

interface PriceImpactDepth {
  '10': number;
  '100': number;
  '1000': number;
}

interface PriceImpactRatio {
  depth: PriceImpactDepth;
  timestamp: number;
}

interface DepthInfo {
  buyPriceImpactRatio: PriceImpactRatio;
  sellPriceImpactRatio: PriceImpactRatio;
}

interface LastSwappedPrice {
  lastJupiterSellAt: number;
  lastJupiterSellPrice: string;
  lastJupiterBuyAt: number;
  lastJupiterBuyPrice: string;
}

interface QuotedPrice {
  buyPrice: string;
  buyAt: number;
  sellPrice: string;
  sellAt: number;
}

interface TokenExtraInfo {
  lastSwappedPrice: LastSwappedPrice;
  quotedPrice: QuotedPrice;
  confidenceLevel: 'high' | 'medium' | 'low';
  depth: DepthInfo;
}

interface TokenPriceInfo {
  id: string;
  type: 'derivedPrice' | string;
  price: string;
  extraInfo: TokenExtraInfo;
}

export interface JupiterPriceResponse {
  data: {
    [tokenAddress: string]: TokenPriceInfo;
  };
  timeTaken: number;
}

export interface TokenPriceDetails {
  price: number;
  buyPrice: number;
  sellPrice: number;
  confidenceLevel: string;
  lastTradeAt: Date;
  buyImpact: PriceImpactDepth;
  sellImpact: PriceImpactDepth;
}
