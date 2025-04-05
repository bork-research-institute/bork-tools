import { tweetQueries } from '@/extensions/src/db/queries';
import type { DatabaseTweet } from '@/lib/types/twitter';
import { elizaLogger } from '@elizaos/core';
import { updateAccountEngagementMetrics } from './engagement-metrics';
/**
 * Updates metrics for all tweet authors
 */
export async function updateMetricsForAuthors(
  tweets: DatabaseTweet[],
  context = '[TwitterAccounts]',
): Promise<void> {
  try {
    elizaLogger.info(
      `${context} Starting metrics update for ${tweets.length} tweets`,
    );

    // Group tweets by author
    const tweetsByAuthor = new Map<string, DatabaseTweet[]>();
    for (const tweet of tweets) {
      const authorTweets = tweetsByAuthor.get(tweet.username) || [];
      authorTweets.push(tweet);
      tweetsByAuthor.set(tweet.username, authorTweets);
    }

    elizaLogger.info(
      `${context} Grouped tweets by ${tweetsByAuthor.size} unique authors`,
    );
    elizaLogger.debug({
      authorCounts: Array.from(tweetsByAuthor.entries()).map(
        ([username, tweets]) => ({
          username,
          tweetCount: tweets.length,
        }),
      ),
    });

    // Get all target accounts once
    const accounts = await tweetQueries.getTargetAccounts();
    elizaLogger.info(
      `${context} Retrieved ${accounts.length} target accounts from database`,
    );

    // Process each author's tweets
    let processedAuthors = 0;
    let skippedAuthors = 0;

    for (const [username, authorTweets] of tweetsByAuthor) {
      elizaLogger.debug(
        `${context} Processing author ${username} with ${authorTweets.length} tweets`,
      );

      const account = accounts.find((acc) => acc.username === username);
      if (account) {
        elizaLogger.debug(
          `${context} Found matching target account for ${username}`,
          {
            followersCount: account.followersCount,
            tweetsCount: account.tweetsCount,
            isVerified: account.isVerified,
          },
        );

        await updateAccountEngagementMetrics(
          account,
          context,
          true, // Skip search since we're providing tweets
          authorTweets,
        );
        processedAuthors++;
      } else {
        elizaLogger.debug(
          `${context} No matching target account found for ${username}, skipping metrics update`,
        );
        skippedAuthors++;
      }
    }

    elizaLogger.info(`${context} Completed metrics update processing`);
    elizaLogger.debug({
      totalAuthors: tweetsByAuthor.size,
      processedAuthors,
      skippedAuthors,
      processingRate: `${((processedAuthors / tweetsByAuthor.size) * 100).toFixed(1)}%`,
    });
  } catch (error) {
    elizaLogger.error(
      `${context} Error updating metrics for authors:`,
      error instanceof Error ? error.message : String(error),
      {
        stack: error instanceof Error ? error.stack : undefined,
      },
    );
  }
}
