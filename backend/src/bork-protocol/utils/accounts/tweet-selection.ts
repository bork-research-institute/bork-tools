import { tweetQueries } from '@/extensions/src/db/queries';
import { mapTweet } from '@/mappers/tweet-mapper';
import type { TwitterService } from '@/services/twitter/twitter-service';
import type { TargetAccount } from '@/types/account';
import type { TwitterConfig } from '@/types/config';
import type { TweetSelectionResult } from '@/types/twitter';
import { elizaLogger } from '@elizaos/core';
import { SearchMode, type Tweet } from 'agent-twitter-client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Selects tweets from target accounts based on engagement criteria
 * @param twitterService - Twitter service instance for making API calls
 * @param accounts - List of target accounts to fetch tweets from
 * @param config - Twitter configuration containing search parameters and thresholds
 * @returns Object containing selected tweets and metadata
 */
export async function selectTweetsFromAccounts(
  twitterService: TwitterService,
  accounts: TargetAccount[],
  config: TwitterConfig,
): Promise<TweetSelectionResult[]> {
  const results: TweetSelectionResult[] = [];

  for (const account of accounts) {
    try {
      // 1. Search latest tweets from account
      const { tweets: accountTweets, spammedTweets } =
        await twitterService.searchTweets(
          `from:${account.username}`,
          config.search.tweetLimits.targetAccounts,
          SearchMode.Latest,
          '[TwitterAccounts]',
          {
            excludeReplies: config.search.parameters.excludeReplies,
            excludeRetweets: config.search.parameters.excludeRetweets,
            filterLevel: 'none',
          },
          config.search.engagementThresholds,
        );

      elizaLogger.debug(
        `[TwitterAccounts] Fetched ${accountTweets.length} tweets from ${account.username}`,
        { spammedTweets },
      );

      // Filter out tweets without IDs first
      const validTweets = accountTweets.filter((tweet) => {
        if (!tweet.id) {
          elizaLogger.warn(
            `[TwitterAccounts] Tweet from ${account.username} missing ID:`,
            {
              text: tweet.text?.substring(0, 100),
            },
          );
          return false;
        }
        return true;
      });

      // Check which tweets have already been processed
      const existingTweetIds = new Set(
        (
          await Promise.all(
            validTweets.map((tweet) =>
              tweetQueries.findTweetByTweetId(tweet.id),
            ),
          )
        )
          .filter(Boolean)
          .map((tweet) => tweet.tweet_id),
      );

      // Filter out already processed tweets
      const unprocessedTweets = validTweets.filter(
        (tweet) => !existingTweetIds.has(tweet.id),
      );

      if (validTweets.length > unprocessedTweets.length) {
        elizaLogger.debug(
          `[TwitterAccounts] Filtered out ${
            validTweets.length - unprocessedTweets.length
          } already processed tweets from ${account.username}`,
        );
      }

      // Map tweets to ensure all fields have default values
      const mappedTweets = unprocessedTweets.map((tweet) => ({
        ...mapTweet(tweet),
        id: uuidv4(), // Generate a UUID for our database
        tweet_id: tweet.id, // Keep Twitter's ID
      }));

      // Collect most recent tweets that meet engagement criteria
      let processedCount = 0;
      const selectedTweets: Tweet[] = [];
      const thresholds = config.search.engagementThresholds;

      for (const tweet of mappedTweets) {
        if (meetsCriteria(tweet, thresholds)) {
          selectedTweets.push(tweet);
          processedCount++;

          if (
            processedCount >= config.search.tweetLimits.qualityTweetsPerAccount
          ) {
            break;
          }
        }
      }

      elizaLogger.info(
        `[TwitterAccounts] Selected ${selectedTweets.length} tweets meeting criteria from ${mappedTweets.length} unprocessed tweets for ${account.username}`,
      );
      elizaLogger.debug({
        minLikes: thresholds.minLikes,
        minRetweets: thresholds.minRetweets,
        minReplies: thresholds.minReplies,
        maxQualityTweets: config.search.tweetLimits.qualityTweetsPerAccount,
      });

      results.push({
        tweets: selectedTweets,
        spammedTweets: spammedTweets || 0,
        processedCount,
      });
    } catch (error) {
      elizaLogger.error(
        `[TwitterAccounts] Error fetching tweets from ${account.username}:`,
        error instanceof Error ? error.message : String(error),
      );

      // Add empty result for failed account
      results.push({
        tweets: [],
        spammedTweets: 0,
        processedCount: 0,
      });
    }
  }

  return results;
}

/**
 * Checks if a tweet meets the engagement criteria thresholds
 */
function meetsCriteria(
  tweet: Tweet,
  thresholds: TwitterConfig['search']['engagementThresholds'],
): boolean {
  return (
    (tweet.likes || 0) >= thresholds.minLikes &&
    (tweet.retweets || 0) >= thresholds.minRetweets &&
    (tweet.replies || 0) >= thresholds.minReplies
  );
}
