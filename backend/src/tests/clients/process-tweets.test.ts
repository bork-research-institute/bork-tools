import { expect } from 'bun:test';
import { elizaLogger } from '@elizaos/core';
import type { IAgentRuntime } from '@elizaos/core';
import { Scraper } from 'agent-twitter-client';
import { validateTweets } from '../../bork-protocol/helpers/tweet-validation-helper';
import { TwitterService } from '../../bork-protocol/services/twitter/twitter-service';
import {
  getUpstreamTweets,
  prepareTweetsForUpstreamFetching,
} from '../../bork-protocol/services/twitter/upstream-tweet-fetching-service';
import type { MergedTweet } from '../../bork-protocol/types/twitter';
import { mockTweets } from '../mock-data/mock-tweets';

export interface TweetProcessingTestResult {
  validTweets: number;
  mergedTweets: MergedTweet[];
  relatedTweetsFound: number;
}

function logMergedTweet(tweet: MergedTweet, prefix = '') {
  elizaLogger.info(`${prefix}Merged Tweet:`, {
    id: tweet.id,
    tweet_id: tweet.tweet_id,
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
    thread: {
      size: tweet.threadSize,
      isMerged: tweet.isThreadMerged,
      originalText: tweet.originalText,
    },
    relatedTweets: {
      inReplyTo: tweet.inReplyToStatusId ? tweet.inReplyToStatusId : 'No',
      quoted: tweet.quotedStatusId ? tweet.quotedStatusId : 'No',
      retweeted: tweet.retweetedStatusId ? tweet.retweetedStatusId : 'No',
      threadCount: tweet.thread.length,
    },
  });
}

export async function testProcessTweets(runtime: IAgentRuntime) {
  elizaLogger.info('[Test] Starting tweet processing test');

  try {
    // Initialize Twitter service
    const twitterClient = new Scraper();
    const twitterService = new TwitterService(twitterClient, runtime);
    const initialized = await twitterService.initialize();

    if (!initialized) {
      throw new Error('Failed to initialize Twitter service');
    }

    // Step 1: Validate tweets
    elizaLogger.info('[Test] Validating tweets...');
    const validTweets = validateTweets(mockTweets);
    elizaLogger.info('[Test] Validation results:', {
      inputTweets: mockTweets.length,
      validTweets: validTweets.length,
      invalidTweets: mockTweets.length - validTweets.length,
    });

    if (validTweets.length === 0) {
      throw new Error('No valid tweets found');
    }

    // Step 2: Prepare tweets for merging
    elizaLogger.info('[Test] Preparing tweets for merging...');
    const tweetsToMerge = prepareTweetsForUpstreamFetching(validTweets);
    elizaLogger.info('[Test] Preparation results:', {
      preparedTweets: tweetsToMerge.length,
    });

    // Step 3: Merge tweet content with related tweets
    elizaLogger.info(
      '[Test] Merging upstream quote tweets or retweets content...',
    );
    const mergedTweets = await getUpstreamTweets(
      twitterService,
      runtime,
      tweetsToMerge,
    );

    // Log results for each merged tweet
    elizaLogger.info('[Test] Merged tweets results:');
    for (const tweet of mergedTweets) {
      logMergedTweet(tweet, '  ');
    }

    // Verify results
    expect(mergedTweets.length).toBeGreaterThan(0);
    expect(mergedTweets.length).toBeLessThanOrEqual(validTweets.length);

    // Check that merged tweets have the required fields
    for (const tweet of mergedTweets) {
      expect(tweet.id).toBeDefined();
      expect(tweet.tweet_id).toBeDefined();
      expect(tweet.text).toBeDefined();
      expect(typeof tweet.isThreadMerged).toBe('boolean');
      expect(typeof tweet.threadSize).toBe('number');
      expect(tweet.originalText).toBeDefined();
      expect(Array.isArray(tweet.thread)).toBe(true);
    }

    const finalResults = {
      validTweets: validTweets.length,
      mergedTweets,
      relatedTweetsFound: mergedTweets.reduce(
        (acc, tweet) =>
          acc +
          tweet.thread.length +
          (tweet.inReplyToStatus ? 1 : 0) +
          (tweet.quotedStatus ? 1 : 0) +
          (tweet.retweetedStatus ? 1 : 0),
        0,
      ),
    };

    elizaLogger.info('[Test] Final test results:', {
      validTweets: finalResults.validTweets,
      mergedTweetsCount: finalResults.mergedTweets.length,
      relatedTweetsFound: finalResults.relatedTweetsFound,
    });

    return finalResults;
  } catch (error) {
    elizaLogger.error('[Test] Error in tweet processing test:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
