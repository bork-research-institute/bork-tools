import { transformSnapshots } from '@/lib/helpers/metrics';
import { tokenSnapshotService } from '@/lib/services/token-snapshot-service';
import type { TimeFrame } from '@/lib/services/token-snapshot-service';
import { tweetService } from '@/lib/services/tweets';
import type {
  TokenSnapshot,
  TokenWithEngagement,
} from '@/types/token-monitor/token';

class TokenMetricsService {
  private timeframe: TimeFrame = '1d';

  setTimeframe(timeframe: TimeFrame) {
    this.timeframe = timeframe;
    tokenSnapshotService.setTimeframe(timeframe);
  }

  async fetchInitialTokenSnapshots(): Promise<TokenSnapshot[]> {
    try {
      const snapshots = await tokenSnapshotService.getTokenSnapshots();
      return transformSnapshots(snapshots);
    } catch (error) {
      console.error('Error fetching initial token snapshots:', error);
      return [];
    }
  }

  async setupSubscription(
    onUpdate: (snapshots: TokenSnapshot[]) => void,
  ): Promise<() => void> {
    const unsubscribe = await tokenSnapshotService.subscribeToTokenSnapshots(
      (snapshots) => {
        const transformedSnapshots = transformSnapshots(snapshots);
        onUpdate(transformedSnapshots);
      },
    );
    return unsubscribe;
  }

  async fetchTweetEngagement(
    tokenSnapshots: TokenSnapshot[],
  ): Promise<TokenWithEngagement[]> {
    if (!tokenSnapshots) {
      return [];
    }

    const updatedTokens = await Promise.all(
      tokenSnapshots.map(async (token) => {
        if (!token.tweet_ids || token.tweet_ids.length === 0) {
          return {
            ...token,
            engagement: {
              likes: 0,
              replies: 0,
              retweets: 0,
              views: 0,
              tweets: [],
            },
          } as TokenWithEngagement;
        }

        try {
          // Fetch tweets with analyses once
          const tweets = await tweetService.getTweetsAndAnalysesByIds(
            token.tweet_ids,
          );

          // Filter out tweets without analysis (considered spam)
          const validTweets = tweets.filter(
            (tweet) => tweet.analysis !== null && tweet.analysis !== undefined,
          );

          // Return token with both aggregated metrics and full tweet data
          return {
            ...token,
            engagement: {
              tweets: validTweets, // Include full tweet objects with analyses
            },
          } as TokenWithEngagement;
        } catch (error) {
          console.error('Error fetching tweet data:', error);
          return {
            ...token,
            engagement: {
              likes: 0,
              replies: 0,
              retweets: 0,
              views: 0,
              tweets: [],
            },
          } as TokenWithEngagement;
        }
      }),
    );

    return updatedTokens;
  }
}

export const tokenMetricsService = new TokenMetricsService();
