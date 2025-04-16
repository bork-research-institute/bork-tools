import { expect } from 'bun:test';
import type { TwitterService } from '@/services/twitter/twitter-service';
import { selectTweetsFromAccounts } from '@/utils/selection/select-tweets-from-account';
import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import type { Tweet } from 'agent-twitter-client';
import { testTwitterConfig } from '../config/test-config';
import { mockAccounts } from '../mock-data/mock-accounts';

export interface TweetSelectionTestResult {
  selectedTweets: Tweet[];
  spammedTweetsCount: number;
  processedTweetsCount: number;
}

function logTweet(tweet: Tweet, prefix = '') {
  elizaLogger.info(`${prefix}Tweet:`, {
    id: tweet.id,
    text: tweet.text,
    engagement: {
      likes: tweet.likes,
      retweets: tweet.retweets,
      replies: tweet.replies,
    },
    metadata: {
      isRetweet: tweet.isRetweet,
      isReply: tweet.isReply,
      hasMedia: tweet.photos.length > 0 || tweet.videos.length > 0,
      hashtags: tweet.hashtags,
      mentions: tweet.mentions,
    },
  });
}

export async function testSelectTweetsFromAccounts(runtime: IAgentRuntime) {
  elizaLogger.info('[Test] Starting tweet selection test');

  try {
    // Get Twitter service from runtime's clients
    const twitterClient = runtime.clients.find(
      (client) =>
        (client as unknown as { twitterService: TwitterService })
          .twitterService,
    );
    if (!twitterClient) {
      throw new Error('Twitter client not found in runtime');
    }
    const twitterService = (
      twitterClient as unknown as { twitterService: TwitterService }
    ).twitterService;

    // Select tweets from accounts
    const results = await selectTweetsFromAccounts(
      twitterService,
      mockAccounts,
      testTwitterConfig,
    );

    elizaLogger.info('[Test] Tweet selection results:', {
      totalResults: results.length,
      accountsProcessed: mockAccounts.length,
    });

    // Log results for each account
    for (const [index, result] of results.entries()) {
      const account = mockAccounts[index];
      elizaLogger.info(`[Test] Results for account @${account.username}:`, {
        tweetsFound: result.tweets.length,
        spammedTweets: result.spammedTweets,
        processedCount: result.processedCount,
      });

      if (result.tweets.length > 0) {
        elizaLogger.info(`[Test] Selected tweets from @${account.username}:`);
        for (const tweet of result.tweets) {
          logTweet(tweet, '  ');
        }
      } else {
        elizaLogger.info(
          `[Test] No qualifying tweets found for @${account.username}`,
        );
      }
    }

    // Verify results array length matches number of accounts
    expect(results.length).toBe(mockAccounts.length);

    const finalResults = {
      selectedTweets: results.flatMap((r) => r.tweets),
      spammedTweetsCount: results.reduce((acc, r) => acc + r.spammedTweets, 0),
      processedTweetsCount: results.reduce(
        (acc, r) => acc + r.processedCount,
        0,
      ),
    };

    elizaLogger.info('[Test] Final test results:', {
      totalSelectedTweets: finalResults.selectedTweets.length,
      totalSpammedTweets: finalResults.spammedTweetsCount,
      totalProcessedTweets: finalResults.processedTweetsCount,
    });

    return finalResults;
  } catch (error) {
    elizaLogger.error('[Test] Error in tweet selection test:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
