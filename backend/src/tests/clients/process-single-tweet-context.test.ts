import {
  type IAgentRuntime,
  type Memory,
  elizaLogger,
  stringToUuid,
} from '@elizaos/core';
import { mapToCombinedTweet } from '../../bork-protocol/mappers/combined-tweet-mapper';
import type { TwitterService } from '../../bork-protocol/services/twitter/twitter-service';
import { tweetAnalysisTemplate } from '../../bork-protocol/templates/analysis';
import { fetchAndFormatKnowledge } from '../../bork-protocol/utils/tweet-analysis/process-knowledge';
import { mockTopicWeights } from '../mock-data/mock-topic-weights';
import { mockMergedTweets } from '../mock-data/mock-tweets';

export async function testTweetContextPreparation(runtime: IAgentRuntime) {
  elizaLogger.info('[Test] Starting tweet context preparation test');

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

    // Use the first merged tweet from mock data
    const testTweet = mockMergedTweets[0];

    // Step 1: Map to combined tweet
    const tweet = mapToCombinedTweet(testTweet);

    // Step 2: Cache the tweet
    await twitterService.cacheTweet({
      id: tweet.tweet_id,
      text: tweet.text,
      userId: tweet.userId,
      username: tweet.username,
      name: tweet.name,
      timestamp: tweet.timestamp,
      timeParsed: tweet.timeParsed,
      likes: tweet.likes,
      retweets: tweet.retweets,
      replies: tweet.replies,
      views: tweet.views,
      bookmarkCount: tweet.bookmarkCount,
      conversationId: tweet.conversationId,
      permanentUrl: tweet.permanentUrl,
      html: tweet.html,
      inReplyToStatus: tweet.inReplyToStatus,
      inReplyToStatusId: tweet.inReplyToStatusId,
      quotedStatus: tweet.quotedStatus,
      quotedStatusId: tweet.quotedStatusId,
      retweetedStatus: tweet.retweetedStatus,
      retweetedStatusId: tweet.retweetedStatusId,
      thread: tweet.thread,
      isQuoted: tweet.isQuoted,
      isPin: tweet.isPin,
      isReply: tweet.isReply,
      isRetweet: tweet.isRetweet,
      isSelfThread: tweet.isSelfThread,
      sensitiveContent: tweet.sensitiveContent,
      hashtags: tweet.hashtags,
      mentions: tweet.mentions,
      photos: tweet.photos,
      urls: tweet.urls,
      videos: tweet.videos,
      place: tweet.place,
      poll: tweet.poll,
    });

    // Step 3: Generate template
    const template = tweetAnalysisTemplate({
      text: tweet.text,
      public_metrics: {
        like_count: tweet.likes || 0,
        retweet_count: tweet.retweets || 0,
        reply_count: tweet.replies || 0,
      },
      topics: runtime.character.topics || [],
      topicWeights: mockTopicWeights.slice(0, 3).map((tw) => ({
        topic: tw.topic,
        weight: tw.weight,
      })),
      isThreadMerged: Boolean(tweet.thread?.length),
      threadSize: tweet.thread?.length || 1,
      originalText: tweet.text,
    });

    // Step 4: Create memory user ID and compose state
    const memoryUserId = stringToUuid(`twitter-user-${tweet.userId}`);
    const memory: Memory = {
      content: {
        text: tweet.text,
        isThreadMerged: Boolean(tweet.thread?.length),
        threadSize: tweet.thread?.length || 1,
        originalText: tweet.text,
      },
      userId: memoryUserId,
      agentId: runtime.agentId,
      roomId: stringToUuid(tweet.tweet_id),
    };

    const state = await runtime.composeState(memory, {
      twitterService,
      twitterUserName: runtime.getSetting('TWITTER_USERNAME') || '',
      currentPost: tweet.text,
    });

    // Step 5: Fetch and format knowledge
    const knowledgeContext = await fetchAndFormatKnowledge(
      runtime,
      tweet,
      '[Test] [Knowledge]',
    );

    // Step 6: Add to compose context
    const context = {
      template: template.context,
      state,
      knowledgeContext,
    };

    elizaLogger.info('[Test] Context preparation result:', {
      template: template.context,
      state: {
        memory: memory,
      },
      knowledgeContext,
    });

    return context;
  } catch (error) {
    elizaLogger.error('[Test] Error in context preparation test:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
