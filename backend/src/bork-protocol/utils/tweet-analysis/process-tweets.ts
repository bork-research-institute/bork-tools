import { validateTweets } from '@/helpers/tweet-validation-helper';
import type { TwitterService } from '@/services/twitter/twitter-service';
import { getUpstreamTweets } from '@/services/twitter/upstream-tweet-fetching-service';
import type { TopicWeightRow } from '@/types/topic';
import type { Tweet } from '@/types/twitter';
import { elizaLogger } from '@elizaos/core';
import type { IAgentRuntime } from '@elizaos/core';
import { updateMetricsForAuthors } from '../account-metrics/update-influence-score';
import { processSingleTweet } from './process-single-tweet';

/**
 * Main entry point for processing tweets.
 * Validates, merges, and processes tweet content for analysis.
 */
export async function processTweets(
  runtime: IAgentRuntime,
  twitterService: TwitterService,
  tweets: Tweet[],
  topicWeights: TopicWeightRow[],
): Promise<void> {
  try {
    // Step 1: Validate tweets to ensure they have required fields
    const validTweets = validateTweets(tweets);

    if (validTweets.length === 0) {
      return;
    }

    elizaLogger.info(
      `[TwitterAccounts] Processing ${validTweets.length} tweets`,
    );

    for (const tweet of validTweets) {
      try {
        // Get upstream tweets for this tweet
        const [processedTweet] = await getUpstreamTweets(
          twitterService,
          runtime,
          [tweet],
        );

        if (!processedTweet) {
          continue;
        }

        // Step 2: Update metrics for all authors in this tweet chain
        await updateMetricsForAuthors(processedTweet, '[Tweet Processing]');

        // Step 3: Process the tweet with its full context
        await processSingleTweet(
          runtime,
          twitterService,
          processedTweet,
          topicWeights,
          '[Tweet Processing]',
        );
      } catch (error) {
        elizaLogger.error(
          '[Tweet Processing] Error processing individual tweet:',
          {
            error: error instanceof Error ? error.message : String(error),
            tweetId: tweet.tweet_id,
          },
        );
      }
    }

    elizaLogger.info('[TwitterAccounts] Successfully processed all tweets');
  } catch (error) {
    elizaLogger.error(
      '[Tweet Processing] Error processing tweets:',
      error instanceof Error ? error.message : String(error),
    );
  }
}
