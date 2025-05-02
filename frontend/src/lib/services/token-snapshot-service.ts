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

    // First, get all unique token addresses that have snapshots in the timeframe
    const { data: uniqueTokens, error: uniqueTokensError } =
      await supabaseClient
        .from('token_snapshots')
        .select('token_address')
        .gt('timestamp', timeframeCutoff.toISOString())
        .order('timestamp', { ascending: false });

    if (uniqueTokensError) {
      console.error('Error fetching unique tokens:', uniqueTokensError);
      throw new Error(
        `Failed to fetch unique tokens: ${uniqueTokensError.message}`,
      );
    }

    // Get unique token addresses
    const uniqueTokenAddresses = [
      ...new Set(uniqueTokens?.map((t) => t.token_address)),
    ];

    if (uniqueTokenAddresses.length === 0) {
      console.log('No tokens found in the timeframe');
      return [];
    }

    // Fetch the latest snapshot for each token within the timeframe
    const { data, error } = await supabaseClient
      .from('token_snapshots')
      .select('*')
      .in('token_address', uniqueTokenAddresses)
      .gt('timestamp', timeframeCutoff.toISOString())
      .order('timestamp', { ascending: false });

    console.log('Fetched token snapshots:', {
      uniqueTokensCount: uniqueTokenAddresses.length,
      snapshotsCount: data?.length ?? 0,
      timeframeCutoff: timeframeCutoff.toISOString(),
      error,
      firstSnapshot: data?.[0],
    });

    if (error) {
      console.error('Error fetching token snapshots:', error);
      throw new Error(`Failed to fetch token snapshots: ${error.message}`);
    }

    // Group by token_address and get the latest snapshot for each
    const latestSnapshots = new Map<string, TokenSnapshot>();
    for (const snapshot of data || []) {
      const existing = latestSnapshots.get(snapshot.token_address);
      if (
        !existing ||
        new Date(snapshot.timestamp) > new Date(existing.timestamp)
      ) {
        latestSnapshots.set(snapshot.token_address, {
          ...snapshot,
        });
      }
    }

    const result = Array.from(latestSnapshots.values());
    console.log(
      `Returning ${result.length} latest token snapshots with tweet IDs:`,
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
