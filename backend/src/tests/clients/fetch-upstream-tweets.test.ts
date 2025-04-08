import { expect } from 'bun:test';
import { elizaLogger } from '@elizaos/core';
import type { IAgentRuntime } from '@elizaos/core';
import { Scraper } from 'agent-twitter-client';
import { validateTweets } from '../../bork-protocol/helpers/tweet-validation-helper';
import { TwitterService } from '../../bork-protocol/services/twitter/twitter-service';
import { getUpstreamTweets } from '../../bork-protocol/services/twitter/upstream-tweet-fetching-service';
import type { DatabaseTweet } from '../../bork-protocol/types/twitter';
import { mockTweets } from '../mock-data/mock-tweets';

export interface TweetProcessingTestResult {
  validTweets: number;
  processedTweets: {
    originalTweet: DatabaseTweet;
    upstreamTweets: {
      inReplyChain: DatabaseTweet[];
      quotedTweets: DatabaseTweet[];
      retweetedTweets: DatabaseTweet[];
    };
  }[];
  relatedTweetsFound: number;
}

export async function testFetchUpstreamTweets(runtime: IAgentRuntime) {
  elizaLogger.info('[Test] Starting upstream tweet fetching test');

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

    // Step 2: Process tweets and fetch upstream relationships
    elizaLogger.info(
      '[Test] Processing tweets and fetching upstream relationships...',
    );
    const processedTweets = await getUpstreamTweets(
      twitterService,
      runtime,
      validTweets,
    );

    // Verify results
    expect(processedTweets.length).toBeGreaterThan(0);
    expect(processedTweets.length).toBeLessThanOrEqual(validTweets.length);

    // Check that processed tweets have the required fields
    for (const { originalTweet, upstreamTweets } of processedTweets) {
      expect(originalTweet.id).toBeDefined();
      expect(originalTweet.tweet_id).toBeDefined();
      expect(originalTweet.text).toBeDefined();
      expect(typeof originalTweet.isThreadMerged).toBe('boolean');
      expect(typeof originalTweet.threadSize).toBe('number');
      expect(originalTweet.originalText).toBeDefined();
      expect(Array.isArray(originalTweet.thread)).toBe(true);

      // Check upstream tweets
      expect(Array.isArray(upstreamTweets.inReplyChain)).toBe(true);
      expect(Array.isArray(upstreamTweets.quotedTweets)).toBe(true);
      expect(Array.isArray(upstreamTweets.retweetedTweets)).toBe(true);
    }

    const finalResults = {
      validTweets: validTweets.length,
      processedTweets,
      relatedTweetsFound: processedTweets.reduce(
        (acc, { upstreamTweets }) =>
          acc +
          upstreamTweets.inReplyChain.length +
          upstreamTweets.quotedTweets.length +
          upstreamTweets.retweetedTweets.length,
        0,
      ),
    };

    // Log the complete final results object
    elizaLogger.info('[Test] Complete test results:', {
      summary: {
        validTweets: finalResults.validTweets,
        processedTweetsCount: finalResults.processedTweets.length,
        relatedTweetsFound: finalResults.relatedTweetsFound,
      },
      processedTweets: finalResults.processedTweets.map(
        ({ originalTweet, upstreamTweets }) => ({
          originalTweet: {
            // Core tweet data
            id: originalTweet.id,
            tweet_id: originalTweet.tweet_id,
            agentId: originalTweet.agentId,
            text: originalTweet.text,
            userId: originalTweet.userId,
            username: originalTweet.username,
            name: originalTweet.name,
            timestamp: originalTweet.timestamp,
            timeParsed: originalTweet.timeParsed,

            // Engagement metrics
            likes: originalTweet.likes,
            retweets: originalTweet.retweets,
            replies: originalTweet.replies,
            views: originalTweet.views,
            bookmarkCount: originalTweet.bookmarkCount,

            // Tweet metadata
            conversationId: originalTweet.conversationId,
            permanentUrl: originalTweet.permanentUrl,
            html: originalTweet.html,

            // Related tweets
            inReplyToStatusId: originalTweet.inReplyToStatusId,
            quotedStatusId: originalTweet.quotedStatusId,
            retweetedStatusId: originalTweet.retweetedStatusId,
            threadSize: originalTweet.threadSize,

            // Tweet flags
            isQuoted: originalTweet.isQuoted,
            isPin: originalTweet.isPin,
            isReply: originalTweet.isReply,
            isRetweet: originalTweet.isRetweet,
            isSelfThread: originalTweet.isSelfThread,
            sensitiveContent: originalTweet.sensitiveContent,
            isThreadMerged: originalTweet.isThreadMerged,

            // Media and entities
            hashtags: originalTweet.hashtags,
            mentions: originalTweet.mentions,
            photos: originalTweet.photos,
            urls: originalTweet.urls,
            videos: originalTweet.videos,
            place: originalTweet.place,
            poll: originalTweet.poll,
            mediaType: originalTweet.mediaType,
            mediaUrl: originalTweet.mediaUrl,

            // Processing status
            status: originalTweet.status,
            createdAt: originalTweet.createdAt,
            scheduledFor: originalTweet.scheduledFor,
            sentAt: originalTweet.sentAt,
            error: originalTweet.error,
            prompt: originalTweet.prompt,
            newTweetContent: originalTweet.newTweetContent,
            originalText: originalTweet.originalText,

            // Timeline data
            homeTimeline: originalTweet.homeTimeline,
          },
          upstreamTweets: {
            inReplyChain: upstreamTweets.inReplyChain.map((tweet) => ({
              id: tweet.id,
              tweet_id: tweet.tweet_id,
              text: tweet.text,
              username: tweet.username,
            })),
            quotedTweets: upstreamTweets.quotedTweets.map((tweet) => ({
              id: tweet.id,
              tweet_id: tweet.tweet_id,
              text: tweet.text,
              username: tweet.username,
            })),
            retweetedTweets: upstreamTweets.retweetedTweets.map((tweet) => ({
              id: tweet.id,
              tweet_id: tweet.tweet_id,
              text: tweet.text,
              username: tweet.username,
            })),
          },
        }),
      ),
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
