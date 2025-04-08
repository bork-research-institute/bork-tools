import { validateTweets } from '@/helpers/tweet-validation-helper';
import type { TwitterService } from '@/services/twitter/twitter-service';
import {
  getUpstreamTweets,
  prepareTweetsForUpstreamFetching,
} from '@/services/twitter/upstream-tweet-fetching-service';
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

    // Step 2: Prepare tweets for fetching by converting to MergedTweet type
    const tweetsToMerge = prepareTweetsForUpstreamFetching(validTweets);

    // Step 3: Get upstream tweets
    const mergedTweets = await getUpstreamTweets(
      twitterService,
      runtime,
      tweetsToMerge,
    );

    elizaLogger.info(
      `[TwitterAccounts] Processing ${mergedTweets.length} tweets`,
    );

    // Step 4: Update metrics for all tweet authors
    await updateMetricsForAuthors(mergedTweets, '[Tweet Processing]');

    // Step 5: Process each tweet individually
    for (const tweet of mergedTweets) {
      await processSingleTweet(
        runtime,
        twitterService,
        tweet,
        topicWeights,
        '[Tweet Processing]',
      );
    }

    elizaLogger.info('[TwitterAccounts] Successfully processed all tweets');
  } catch (error) {
    elizaLogger.error(
      '[Tweet Processing] Error processing tweets:',
      error instanceof Error ? error.message : String(error),
    );
  }
}
