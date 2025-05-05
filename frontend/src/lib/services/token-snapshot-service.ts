import { supabaseClient } from '@/lib/config/client-supabase';
import type { TokenSnapshot } from '@/types/token-monitor/token';

export type TimeFrame = '1d' | '1w' | '1m';

interface TimeframeConfig {
  duration: number; // in hours
  requiredSamples: number;
}

export class TokenSnapshotService {
  private static instance: TokenSnapshotService;
  private currentTimeframe: TimeFrame = '1d';

  private readonly timeframeConfigs: Record<TimeFrame, TimeframeConfig> = {
    '1d': { duration: 24, requiredSamples: 24 },
    '1w': { duration: 168, requiredSamples: 168 }, // 24 * 7
    '1m': { duration: 720, requiredSamples: 720 }, // 24 * 30
  };

  private constructor() {}

  public static getInstance(): TokenSnapshotService {
    if (!TokenSnapshotService.instance) {
      TokenSnapshotService.instance = new TokenSnapshotService();
    }
    return TokenSnapshotService.instance;
  }

  setTimeframe(timeframe: TimeFrame) {
    this.currentTimeframe = timeframe;
  }

  private getTimeframeConfig(): TimeframeConfig {
    return this.timeframeConfigs[this.currentTimeframe];
  }

  private async fetchTokenSnapshots(
    timeframeCutoff: Date,
  ): Promise<TokenSnapshot[]> {
    console.log('Fetching token snapshots with params:', {
      timeframeCutoff: timeframeCutoff.toISOString(),
    });

    // Fetch all snapshots within the timeframe
    const { data, error } = await supabaseClient
      .from('token_snapshots')
      .select('*')
      .gt('timestamp', timeframeCutoff.toISOString())
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching token snapshots:', error);
      throw new Error(`Failed to fetch token snapshots: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log('No snapshots found in the timeframe');
      return [];
    }

    // Group snapshots by token_address
    const groupedSnapshots = data.reduce(
      (acc, snapshot) => {
        if (!acc[snapshot.token_address]) {
          acc[snapshot.token_address] = [];
        }
        acc[snapshot.token_address].push(snapshot);
        return acc;
      },
      {} as Record<string, TokenSnapshot[]>,
    );

    // For each token, return the latest snapshot but combine tweet_ids from all snapshots
    const result = (Object.values(groupedSnapshots) as TokenSnapshot[][]).map(
      (tokenSnapshots) => {
        const latestSnapshot = tokenSnapshots[0];
        const allTweetIds = new Set<string>();

        // Collect all unique tweet_ids from all snapshots
        for (const snapshot of tokenSnapshots) {
          if (snapshot.tweet_ids) {
            for (const id of snapshot.tweet_ids) {
              allTweetIds.add(id);
            }
          }
        }

        return {
          ...latestSnapshot,
          tweet_ids: Array.from(allTweetIds),
        };
      },
    );

    console.log(
      `Returning ${result.length} token snapshots with aggregated tweet IDs:`,
      result[0],
    );
    return result;
  }

  async getTokenSnapshots(): Promise<TokenSnapshot[]> {
    try {
      const config = this.getTimeframeConfig();
      const timeframeCutoff = new Date();
      timeframeCutoff.setHours(timeframeCutoff.getHours() - config.duration);

      console.log('Getting token snapshots:', {
        timeframe: this.currentTimeframe,
        config,
        cutoff: timeframeCutoff.toISOString(),
      });

      return this.fetchTokenSnapshots(timeframeCutoff);
    } catch (error) {
      console.error('Error in getTokenSnapshots:', error);
      throw error;
    }
  }

  async subscribeToTokenSnapshots(
    callback: (snapshots: TokenSnapshot[]) => void,
  ): Promise<() => void> {
    try {
      const subscription = supabaseClient
        .channel('token_snapshots_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'token_snapshots',
          },
          async (payload) => {
            if (payload.new) {
              try {
                // When we get a new snapshot, fetch all current snapshots to maintain consistency
                const snapshots = await this.getTokenSnapshots();
                callback(snapshots);
              } catch (error) {
                console.error('Error processing token snapshot update:', error);
              }
            }
          },
        )
        .subscribe();

      // Initialize with current data
      this.getTokenSnapshots().then((snapshots) => callback(snapshots));

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up token snapshots subscription:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const tokenSnapshotService = TokenSnapshotService.getInstance();
