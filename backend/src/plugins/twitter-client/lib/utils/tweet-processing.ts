import { elizaLogger } from '@elizaos/core';
import type { IAgentRuntime } from '@elizaos/core';
import type { TwitterService } from '../../lib/services/twitter-service';
import type { TopicWeightRow } from '../types/topic';
import type { Tweet } from '../types/twitter';
import { processSingleTweet } from './analysis-processing';
import {
  groupTweetsByUsername,
  updateMetricsForAuthors,
} from './author-metrics-processing';
import { mergeTweetContent } from './tweet-merging';
import { prepareTweetsForMerging, validateTweets } from './tweet-validation';

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

    // Step 4: Group tweets by username for batch processing
    const tweetsByUsername = groupTweetsByUsername(mergedTweets);

    // Step 5: Update metrics for all tweet authors
    await updateMetricsForAuthors(tweetsByUsername, '[Tweet Processing]');

    // Step 6: Process each tweet individually
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
