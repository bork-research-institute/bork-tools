import { expect } from 'bun:test';
import { tweetQueries } from '@/extensions/src/db/queries';
import type { TargetAccount } from '@/types/account';
import { updateMetricsForAuthors } from '@/utils/account-metrics/update-influence-score';
import { elizaLogger } from '@elizaos/core';
import { mockMergedTweets } from '../mock-data/mock-tweets';

interface AccountMetrics {
  avgLikes50: number;
  avgRetweets50: number;
  avgReplies50: number;
  avgViews50: number;
  influenceScore: number;
}

export interface InfluenceScoreTestResult {
  beforeUpdate: {
    accounts: TargetAccount[];
    metrics: {
      [username: string]: AccountMetrics;
    };
  };
  afterUpdate: {
    accounts: TargetAccount[];
    metrics: {
      [username: string]: AccountMetrics;
    };
  };
}

export async function testUpdateInfluenceScore() {
  elizaLogger.info('[Test] Starting influence score update test');

  try {
    // Step 1: Get all usernames from mock data
    const usernames = new Set<string>();
    const engagementData = new Map<
      string,
      { likes: number; retweets: number; replies: number; views: number }
    >();

    for (const mergedTweet of mockMergedTweets) {
      usernames.add(mergedTweet.originalTweet.username);
      // Store engagement data for verification
      engagementData.set(mergedTweet.originalTweet.username, {
        likes: mergedTweet.originalTweet.likes || 0,
        retweets: mergedTweet.originalTweet.retweets || 0,
        replies: mergedTweet.originalTweet.replies || 0,
        views: mergedTweet.originalTweet.views || 0,
      });

      for (const tweet of mergedTweet.upstreamTweets.inReplyChain) {
        usernames.add(tweet.username);
      }
      for (const tweet of mergedTweet.upstreamTweets.quotedTweets) {
        usernames.add(tweet.username);
      }
      for (const tweet of mergedTweet.upstreamTweets.retweetedTweets) {
        usernames.add(tweet.username);
      }
    }

    elizaLogger.info('[Test] Found unique usernames:', {
      count: usernames.size,
      usernames: Array.from(usernames),
    });

    // Step 2: Ensure test accounts exist in database
    for (const username of usernames) {
      await tweetQueries.insertTargetAccount({
        username,
        userId: `test-${username}`,
        displayName: username,
        description: 'Test account',
        followersCount: 1000, // Set a baseline for testing
        followingCount: 500,
        friendsCount: 500,
        mediaCount: 100,
        statusesCount: 1000,
        likesCount: 500,
        listedCount: 50,
        tweetsCount: 1000,
        isPrivate: false,
        isVerified: false,
        isBlueVerified: false,
        joinedAt: new Date(),
        location: '',
        avatarUrl: null,
        bannerUrl: null,
        websiteUrl: null,
        canDm: false,
        createdAt: new Date(),
        lastUpdated: new Date(),
        isActive: true,
        source: 'test',
        avgLikes50: 0,
        avgRetweets50: 0,
        avgReplies50: 0,
        avgViews50: 0,
        engagementRate50: 0,
        influenceScore: 0,
        last50TweetsUpdatedAt: null,
      });
    }

    // Step 3: Get initial state
    const beforeAccounts = await tweetQueries.getTargetAccounts();
    const beforeMetrics: { [username: string]: AccountMetrics } = {};
    for (const account of beforeAccounts) {
      beforeMetrics[account.username] = {
        avgLikes50: account.avgLikes50,
        avgRetweets50: account.avgRetweets50,
        avgReplies50: account.avgReplies50,
        avgViews50: account.avgViews50,
        influenceScore: account.influenceScore,
      };
    }

    // Step 4: Run update for each merged tweet
    for (const mergedTweet of mockMergedTweets) {
      await updateMetricsForAuthors(mergedTweet);
    }

    // Step 5: Get final state
    const afterAccounts = await tweetQueries.getTargetAccounts();
    const afterMetrics: { [username: string]: AccountMetrics } = {};
    for (const account of afterAccounts) {
      afterMetrics[account.username] = {
        avgLikes50: account.avgLikes50,
        avgRetweets50: account.avgRetweets50,
        avgReplies50: account.avgReplies50,
        avgViews50: account.avgViews50,
        influenceScore: account.influenceScore,
      };
    }

    // Step 6: Verify updates
    for (const username of usernames) {
      const after = afterMetrics[username];
      const engagement = engagementData.get(username);

      // Basic validation that metrics are within expected ranges
      expect(after.avgLikes50).toBeGreaterThanOrEqual(0);
      expect(after.avgRetweets50).toBeGreaterThanOrEqual(0);
      expect(after.avgReplies50).toBeGreaterThanOrEqual(0);
      expect(after.avgViews50).toBeGreaterThanOrEqual(0);
      expect(after.influenceScore).toBeGreaterThanOrEqual(0);
      expect(after.influenceScore).toBeLessThanOrEqual(1);

      // For accounts with engagement data, verify metrics match
      if (
        engagement &&
        (engagement.likes > 0 ||
          engagement.retweets > 0 ||
          engagement.replies > 0)
      ) {
        // Verify engagement metrics match the input data
        expect(after.avgLikes50).toBe(engagement.likes);
        expect(after.avgRetweets50).toBe(engagement.retweets);
        expect(after.avgReplies50).toBe(engagement.replies);
        if (engagement.views > 0) {
          expect(after.avgViews50).toBe(engagement.views);
        }

        // Verify influence score was calculated (should be greater than base score)
        // The base score is calculated from follower count only when there's no engagement
        const baseScore = Math.min(1, (Math.log10(1001) / 8) * 0.3 * 1.5);
        expect(after.influenceScore).toBeGreaterThan(baseScore);
      } else {
        // For accounts without engagement data, verify they have the base influence score
        const baseScore = Math.min(1, (Math.log10(1001) / 8) * 0.3 * 1.5);
        expect(after.influenceScore).toBeCloseTo(baseScore, 4);
      }
    }

    // Return complete test results
    const finalResults: InfluenceScoreTestResult = {
      beforeUpdate: {
        accounts: beforeAccounts,
        metrics: beforeMetrics,
      },
      afterUpdate: {
        accounts: afterAccounts,
        metrics: afterMetrics,
      },
    };

    elizaLogger.info(
      '[Test] Influence score update test completed successfully',
    );
    elizaLogger.debug('Test results:', {
      accountsProcessed: usernames.size,
      beforeMetrics,
      afterMetrics,
    });

    return finalResults;
  } catch (error) {
    elizaLogger.error('[Test] Error in influence score update test:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
