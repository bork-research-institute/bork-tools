import { mergeTweetContent } from '@/lib/helpers/tweet-merging-helper';
import {
  prepareTweetsForMerging,
  validateTweets,
} from '@/lib/helpers/tweet-validation-helper';
import type { TwitterService } from '@/lib/services/twitter-service';
import type { TopicWeightRow } from '@/lib/types/topic';
import type { Tweet } from '@/lib/types/twitter';
import { elizaLogger } from '@elizaos/core';
import type { IAgentRuntime } from '@elizaos/core';
import { updateMetricsForAuthors } from '../accounts/update-account-influence-score';
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

    // Step 2: Prepare tweets for merging by converting to MergedTweet type
    const tweetsToMerge = prepareTweetsForMerging(validTweets);

    // Step 3: Merge tweet content with related tweets
    const mergedTweets = await mergeTweetContent(
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
