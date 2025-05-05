import type { TokenSnapshot } from '@/types/token-monitor/token';

// Helper function to transform snapshots
export const transformSnapshots = (
  snapshots: TokenSnapshot[],
): TokenSnapshot[] => {
  // Group snapshots by token address
  const groupedSnapshots = snapshots.reduce<Record<string, TokenSnapshot[]>>(
    (acc, snapshot) => {
      const address = snapshot.token_address;
      if (!acc[address]) {
        acc[address] = [];
      }
      acc[address].push(snapshot);
      return acc;
    },
    {},
  );

  // Process each group to combine tweet IDs and use most recent metrics
  return Object.values(groupedSnapshots).map((tokenSnapshots) => {
    // Sort snapshots by timestamp descending to get most recent first
    const sortedSnapshots = tokenSnapshots.sort((a, b) => {
      const timestampA = a.timestamp ? Number(a.timestamp) : 0;
      const timestampB = b.timestamp ? Number(b.timestamp) : 0;
      return timestampB - timestampA;
    });

    const mostRecent = sortedSnapshots[0];

    // Combine unique tweet IDs from all snapshots
    const uniqueTweetIds = Array.from(
      new Set(sortedSnapshots.flatMap((snapshot) => snapshot.tweet_ids || [])),
    );

    return {
      id: mostRecent.id,
      token_address: mostRecent.token_address,
      timestamp: mostRecent.timestamp,
      created_at: mostRecent.created_at,
      tweet_ids: uniqueTweetIds,
      data: {
        ...mostRecent.data,
        timestamp: mostRecent.data.timestamp || mostRecent.timestamp,
        priceInfo: mostRecent.data.priceInfo
          ? {
              ...mostRecent.data.priceInfo,
              lastTradeAt: mostRecent.data.priceInfo.lastTradeAt,
            }
          : undefined,
        liquidityMetrics: mostRecent.data.liquidityMetrics
          ? {
              ...mostRecent.data.liquidityMetrics,
              volumeMetrics: mostRecent.data.liquidityMetrics.volumeMetrics
                ? {
                    ...mostRecent.data.liquidityMetrics.volumeMetrics,
                  }
                : undefined,
            }
          : undefined,
      },
    };
  });
};
