import type { TokenSnapshot } from '@bork/plugins/token-monitor/types/token';

export interface TokenSnapshotRow {
  id: string;
  token_address: string;
  timestamp: Date;
  data: TokenSnapshot;
  tweet_ids?: string[];
}

export interface TokenMetricsHistory {
  id: string;
  token_address: string;
  timestamp: Date;
  holder_count: number;
  supply: number;
  market_cap?: number;
  price?: number;
  volume_24h?: number;
  liquidity?: number;
}

// Re-export TokenSnapshot type for convenience
export type { TokenSnapshot };
