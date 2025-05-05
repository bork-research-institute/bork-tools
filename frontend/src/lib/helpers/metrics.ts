import type { TokenSnapshot } from '@/types/token-monitor/token';

// Helper function to transform snapshots
export const transformSnapshots = (
  snapshots: TokenSnapshot[],
): TokenSnapshot[] => {
  return snapshots.map((snapshot) => ({
    id: snapshot.id,
    token_address: snapshot.token_address,
    timestamp: snapshot.timestamp,
    created_at: snapshot.created_at,
    tweet_ids: snapshot.tweet_ids || [],
    data: {
      ...snapshot.data,
      timestamp: snapshot.data.timestamp || snapshot.timestamp,
      priceInfo: snapshot.data.priceInfo
        ? {
            ...snapshot.data.priceInfo,
            lastTradeAt: snapshot.data.priceInfo.lastTradeAt,
          }
        : undefined,
      liquidityMetrics: snapshot.data.liquidityMetrics
        ? {
            ...snapshot.data.liquidityMetrics,
            volumeMetrics: snapshot.data.liquidityMetrics.volumeMetrics
              ? {
                  ...snapshot.data.liquidityMetrics.volumeMetrics,
                }
              : undefined,
          }
        : undefined,
    },
  }));
};
