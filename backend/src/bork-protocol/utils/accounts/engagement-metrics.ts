import { tweetQueries } from '@/extensions/src/db/queries';
import type { TargetAccount } from '@/types/account';
import type { DatabaseTweet } from '@/types/twitter';
import { elizaLogger } from '@elizaos/core';

/**
 * Updates engagement metrics for an account based on their last 50 tweets.
 * This calculates average engagement values to help rank accounts for future selections.
 */
export async function updateAccountEngagementMetrics(
  account: TargetAccount,
  context = '[TwitterAccounts]',
  skipSearch = false, // New parameter to skip the search when we're already processing tweets
  providedTweets?: DatabaseTweet[], // Optional parameter for tweets we already have
): Promise<void> {
  try {
    // Check if account was updated recently to avoid excessive API calls
    const lastUpdated = account.last50TweetsUpdatedAt;
    const now = new Date();
    const hoursSinceLastUpdate = lastUpdated
      ? (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60)
      : 999; // Large number if never updated

    // Only skip if we've updated recently AND we're not processing new tweets
    // FIXME: Seems odd we check that skipSearch is false to skip search :D. I believe we can get rid of skipSearch in that case
    if (hoursSinceLastUpdate < 24 && !skipSearch && !providedTweets) {
      elizaLogger.info(
        `${context} Skipping engagement metrics update for ${account.username} - updated ${hoursSinceLastUpdate.toFixed(1)} hours ago`,
      );
      return;
    }

    // Log that we're updating metrics
    elizaLogger.info(
      `${context} Updating engagement metrics for ${account.username}`,
    );

    // Use provided tweets or fetch from database
    const tweets =
      providedTweets ||
      (await tweetQueries.getTweetsByUsername(account.username, 50));

    elizaLogger.info(
      `${context} Found ${tweets.length} tweets in database for ${account.username}`,
    );

    // Process metrics if we have tweets
    if (tweets.length > 0) {
      // Calculate average engagement metrics
      const sumLikes = tweets.reduce((sum, t) => sum + (t.likes || 0), 0);
      const sumRetweets = tweets.reduce((sum, t) => sum + (t.retweets || 0), 0);
      const sumReplies = tweets.reduce((sum, t) => sum + (t.replies || 0), 0);
      const sumViews = tweets.reduce((sum, t) => sum + (t.views || 0), 0);

      const avgLikes = tweets.length ? sumLikes / tweets.length : 0;
      const avgRetweets = tweets.length ? sumRetweets / tweets.length : 0;
      const avgReplies = tweets.length ? sumReplies / tweets.length : 0;
      const avgViews = tweets.length ? sumViews / tweets.length : 0;

      // Calculate engagement rate (weighted average of all metrics)
      // Views are given less weight since they're more passive
      const totalFollowers = account.followersCount || 1; // Avoid division by zero
      const engagementRate =
        ((avgLikes * 3 + avgRetweets * 5 + avgReplies * 2) / totalFollowers) *
        100;

      // Calculate influence score based on multiple factors
      const followerWeight = Math.log10(totalFollowers + 1) / 8; // Normalize follower count (0-1)
      const engagementWeight = engagementRate / 100; // Normalize engagement rate (0-1)
      const reachMultiplier = avgViews > 0 ? Math.log10(avgViews + 1) / 6 : 0.5; // View reach factor

      // Combine factors for influence score (0-1)
      const influenceScore = Math.min(
        1,
        (followerWeight * 0.3 + engagementWeight * 0.5) * (1 + reachMultiplier),
      );

      // Update the account metrics
      await tweetQueries.updateTargetAccountMetrics(account.username, {
        avgLikes50: avgLikes,
        avgRetweets50: avgRetweets,
        avgReplies50: avgReplies,
        avgViews50: avgViews,
        last50TweetsUpdatedAt: new Date(),
        influenceScore,
      });

      elizaLogger.info(
        `${context} Updated engagement metrics for ${account.username}:`,
        {
          avgLikes: avgLikes.toFixed(2),
          avgRetweets: avgRetweets.toFixed(2),
          avgReplies: avgReplies.toFixed(2),
          avgViews: avgViews > 0 ? avgViews.toFixed(2) : 'n/a',
          engagementRate: `${engagementRate.toFixed(4)}%`,
          influenceScore: influenceScore.toFixed(4),
          tweetsAnalyzed: tweets.length,
        },
      );
    } else {
      elizaLogger.warn(
        `${context} No tweets found in database for ${account.username}`,
      );
    }
  } catch (error) {
    elizaLogger.error(
      `${context} Error updating engagement metrics for ${account.username}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}
