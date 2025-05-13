export interface DexScreenerToken {
  address: string;
  name: string;
  symbol: string;
}

export interface DexScreenerLiquidity {
  usd: number;
  base: number;
  quote: number;
}

export interface DexScreenerVolume {
  h24?: number;
  h6?: number;
  h1?: number;
  m5?: number;
}

export interface DexScreenerPriceChange {
  h24?: number;
  h6?: number;
  h1?: number;
  m5?: number;
}

export interface DexScreenerTransactions {
  h24?: {
    buys: number;
    sells: number;
  };
  h6?: {
    buys: number;
    sells: number;
  };
  h1?: {
    buys: number;
    sells: number;
  };
  m5?: {
    buys: number;
    sells: number;
  };
}

export interface DexScreenerSocial {
  platform: string;
  handle: string;
}

export interface DexScreenerWebsite {
  url: string;
}

export interface DexScreenerInfo {
  imageUrl?: string;
  websites?: DexScreenerWebsite[];
  socials?: DexScreenerSocial[];
}

export interface DexScreenerBoosts {
  active: number;
}

export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  labels?: string[];
  baseToken: DexScreenerToken;
  quoteToken: DexScreenerToken;
  priceNative: string;
  priceUsd: string;
  txns: DexScreenerTransactions;
  volume: DexScreenerVolume;
  priceChange: DexScreenerPriceChange;
  liquidity: DexScreenerLiquidity;
  fdv?: number;
  marketCap?: number;
  pairCreatedAt: number;
  info?: DexScreenerInfo;
  boosts?: DexScreenerBoosts;
}
