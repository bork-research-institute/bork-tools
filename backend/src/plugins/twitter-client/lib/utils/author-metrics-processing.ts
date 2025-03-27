import { elizaLogger } from '@elizaos/core';
import { tweetQueries } from '../../../bork-extensions/src/db/queries';
import { updateAccountEngagementMetrics } from '../../client-account/utils/engagement-metrics';
import type { DatabaseTweet } from '../types/twitter';

/**
 * Groups tweets by username for batch processing
 */
export function groupTweetsByUsername(
  tweets: DatabaseTweet[],
): Map<string, DatabaseTweet[]> {
  const tweetsByUsername = new Map<string, DatabaseTweet[]>();

  for (const tweet of tweets) {
    if (tweet.username) {
      const tweets = tweetsByUsername.get(tweet.username) || [];
      tweets.push(tweet);
      tweetsByUsername.set(tweet.username, tweets);
    }
  }

  return tweetsByUsername;
}

/**
 * Updates metrics for all tweet authors
 */
export async function updateMetricsForAuthors(
  tweetsByUsername: Map<string, DatabaseTweet[]>,
  logPrefix = '[Author Metrics]',
): Promise<void> {
  for (const [username] of tweetsByUsername.entries()) {
    try {
      elizaLogger.info(`${logPrefix} Processing metrics for user: ${username}`);

      // Get all target accounts to find the author
      const accounts = await tweetQueries.getTargetAccounts();
      const account = accounts.find((acc) => acc.username === username);

      if (account) {
        // Pass skipSearch=true to avoid triggering additional searches
        // when we're already processing tweets from this account
        await updateAccountEngagementMetrics(account, logPrefix, true);
      }
    } catch (error) {
      elizaLogger.error(
        `${logPrefix} Error updating metrics for author ${username}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
