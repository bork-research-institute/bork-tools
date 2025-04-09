import { describe, expect, test } from 'bun:test';
import {
  type ClientInstance,
  type IAgentRuntime,
  type Memory,
  type State,
  elizaLogger,
  stringToUuid,
} from '@elizaos/core';
import { mapToCombinedTweet } from '../../bork-protocol/mappers/combined-tweet-mapper';
import type { TwitterService } from '../../bork-protocol/services/twitter/twitter-service';
import { tweetAnalysisTemplate } from '../../bork-protocol/templates/analysis';
import { fetchAndFormatKnowledge } from '../../bork-protocol/utils/tweet-analysis/process-knowledge';
import { mockTopicWeights } from '../mock-data/mock-topic-weights';
import { mockMergedTweets } from '../mock-data/mock-tweets';

// biome-ignore lint/suspicious/noExportsInTest: <explanation>
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
    const state = await runtime.composeState(
      {
        content: {
          text: tweet.text,
          isThreadMerged: Boolean(tweet.thread?.length),
          threadSize: tweet.thread?.length || 1,
          originalText: tweet.text,
        },
        userId: memoryUserId,
        agentId: runtime.agentId,
        roomId: stringToUuid(tweet.tweet_id),
      } as Memory,
      {
        twitterService,
        twitterUserName: runtime.getSetting('TWITTER_USERNAME') || '',
        currentPost: tweet.text,
      },
    );

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
        memory: {
          content: (state.memory as Memory).content,
          userId: (state.memory as Memory).userId,
        },
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

describe('Tweet Context Preparation', () => {
  test('should prepare tweet context with knowledge', async () => {
    const mockTwitterService = {
      cacheTweet: async () => {},
      initialize: async () => true,
    } as unknown as TwitterService;

    const mockTwitterClient = {
      twitterService: mockTwitterService,
      runtime: {} as IAgentRuntime,
      start: async () => {},
      stop: async () => {},
    } as unknown as ClientInstance;

    const runtime = {
      agentId: stringToUuid('test-agent'),
      character: {
        topics: ['crypto', 'defi', 'trading'],
      },
      composeState: async (
        memory: Memory,
        context: Record<string, unknown>,
      ): Promise<State> => ({
        memory,
        context,
        bio: '',
        lore: '',
        messageDirections: '',
        postDirections: '',
        conversationHistory: [],
        conversationSummary: '',
        conversationTopics: [],
        conversationContext: {},
        roomId: memory.roomId,
        actors: 'user, agent',
        recentMessages: '',
        recentMessagesData: [],
      }),
      getSetting: (key: string): string => {
        if (key === 'TWITTER_USERNAME') {
          return 'test_user';
        }
        return '';
      },
      cacheManager: {
        get: async <T>(_key: string): Promise<T | undefined> => undefined,
        set: async <T>(_key: string, _value: T): Promise<void> => {},
        delete: async (_key: string): Promise<void> => {},
        clear: async (): Promise<void> => {},
      },
      clients: [mockTwitterClient],
    } as unknown as IAgentRuntime;

    const context = await testTweetContextPreparation(runtime);

    // Verify the context
    expect(context).toBeDefined();
    expect(context.template).toBeDefined();
    expect(context.state).toBeDefined();
    expect(context.knowledgeContext).toBeDefined();

    expect(context.state.memory).toBeDefined();
    expect((context.state.memory as Memory).userId).toBeDefined();
  });
});
