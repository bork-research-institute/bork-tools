import { elizaLogger } from '@elizaos/core';
import { threadQueries } from '../../db/thread-queries';
import type { ThreadPerformanceMetrics } from '../../db/thread-schema';
import type { TwitterService } from '../../services/twitter/twitter-service';

/**
 * Fetches the latest metrics for each tweet in a thread and updates the thread's performance metrics
 */
export async function updateThreadMetrics(
  threadId: string,
  tweetIds: string[] | null | undefined,
  twitterService: TwitterService,
): Promise<void> {
  try {
    if (!tweetIds || !Array.isArray(tweetIds) || tweetIds.length === 0) {
      elizaLogger.warn('[UpdateMetrics] No tweet IDs provided for thread', {
        threadId,
        tweetIds,
      });
      return;
    }

    elizaLogger.info('[UpdateMetrics] Fetching metrics for thread', {
      threadId,
      tweetCount: tweetIds.length,
    });

    // Fetch metrics for each tweet
    const tweetMetrics = await Promise.all(
      tweetIds.map(async (tweetId) => {
        if (!tweetId) {
          elizaLogger.warn('[UpdateMetrics] Invalid tweet ID in array', {
            threadId,
            tweetId,
          });
          return null;
        }

        const tweet = await twitterService.getTweet(tweetId);
        if (!tweet) {
          elizaLogger.warn('[UpdateMetrics] Could not fetch tweet', {
            tweetId,
          });
          return null;
        }
        return {
          likes: tweet.likes || 0,
          retweets: tweet.retweets || 0,
          replies: tweet.replies || 0,
          views: tweet.views || 0,
        };
      }),
    );

    // Filter out null values and aggregate metrics
    const validMetrics = tweetMetrics.filter(
      (m): m is NonNullable<typeof m> => m !== null,
    );

    if (validMetrics.length === 0) {
      elizaLogger.warn(
        '[UpdateMetrics] No valid metrics found for any tweets in thread',
        {
          threadId,
          originalTweetCount: tweetIds.length,
        },
      );
      return;
    }

    const aggregatedMetrics: ThreadPerformanceMetrics = {
      likes: validMetrics.reduce((sum, m) => sum + m.likes, 0),
      retweets: validMetrics.reduce((sum, m) => sum + m.retweets, 0),
      replies: validMetrics.reduce((sum, m) => sum + m.replies, 0),
      views: validMetrics.reduce((sum, m) => sum + m.views, 0),
      // Calculate performance score based on engagement weights
      performanceScore:
        validMetrics.reduce((sum, m) => sum + m.likes, 0) * 0.4 +
        validMetrics.reduce((sum, m) => sum + m.retweets, 0) * 0.3 +
        validMetrics.reduce((sum, m) => sum + m.replies, 0) * 0.3,
    };

    // Update thread metrics in database
    await threadQueries.updateThreadPerformanceMetrics(
      threadId,
      aggregatedMetrics,
    );

    elizaLogger.info('[UpdateMetrics] Successfully updated thread metrics', {
      threadId,
      metrics: aggregatedMetrics,
      processedTweets: validMetrics.length,
      totalTweets: tweetIds.length,
    });
  } catch (error) {
    elizaLogger.error('[UpdateMetrics] Error updating thread metrics:', {
      threadId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Updates metrics for multiple threads sequentially to avoid rate limiting
 */
export async function updateAllThreadsMetrics(
  threads: Array<{ id: string; tweetIds: string[] }>,
  twitterService: TwitterService,
): Promise<void> {
  for (const thread of threads) {
    try {
      await updateThreadMetrics(thread.id, thread.tweetIds, twitterService);
      // Add a small delay between threads to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      elizaLogger.error('[UpdateMetrics] Error updating thread:', {
        threadId: thread.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
