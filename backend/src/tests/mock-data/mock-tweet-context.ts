import type { Memory, State } from '@elizaos/core';
import { stringToUuid } from '@elizaos/core';
import { mockTopicWeights } from './mock-topic-weights';
import { mockMergedTweets } from './mock-tweets';

const testTweet = mockMergedTweets[0];
const mappedTweet = {
  text: testTweet.originalTweet.text,
  likes: testTweet.originalTweet.likes,
  retweets: testTweet.originalTweet.retweets,
  replies: testTweet.originalTweet.replies,
  isThreadMerged: Boolean(testTweet.originalTweet.thread?.length),
  threadSize: testTweet.originalTweet.thread?.length || 1,
  originalText: testTweet.originalTweet.text,
  tweet_id: testTweet.originalTweet.id,
  userId: testTweet.originalTweet.userId,
};

// Mock TwitterService implementation
export const mockTwitterService = {
  initialize: async () => true,
  cacheTweet: async () => {},
  getCachedTweet: async () => null,
  clearCache: async () => {},
  client: {
    getTweet: async () => testTweet.originalTweet,
    getThread: async () => [testTweet.originalTweet],
  },
};

export const mockTweetContext = {
  template: {
    text: mappedTweet.text,
    public_metrics: {
      like_count: mappedTweet.likes || 0,
      retweet_count: mappedTweet.retweets || 0,
      reply_count: mappedTweet.replies || 0,
    },
    topics: ['crypto', 'defi', 'trading'],
    topicWeights: mockTopicWeights.slice(0, 3).map((tw) => ({
      topic: tw.topic,
      weight: tw.weight,
    })),
    isThreadMerged: mappedTweet.isThreadMerged,
    threadSize: mappedTweet.threadSize,
    originalText: mappedTweet.originalText,
  },
  state: {
    memory: {
      content: {
        text: mappedTweet.text,
        isThreadMerged: mappedTweet.isThreadMerged,
        threadSize: mappedTweet.threadSize,
        originalText: mappedTweet.originalText,
      },
      userId: stringToUuid(`twitter-user-${mappedTweet.userId}`),
      agentId: stringToUuid('test-agent'),
      roomId: stringToUuid(mappedTweet.tweet_id),
    } as Memory,
    context: {
      twitterService: mockTwitterService,
      twitterUserName: 'test_user',
      currentPost: mappedTweet.text,
    },
    bio: '',
    lore: '',
    messageDirections: '',
    postDirections: '',
    conversationHistory: [],
    conversationSummary: '',
    conversationTopics: [],
    conversationContext: {},
    roomId: stringToUuid(mappedTweet.tweet_id),
    actors: 'user, agent',
    recentMessages: '',
    recentMessagesData: [],
  } as State,
  knowledgeContext: {
    knowledge: '[Test] [Knowledge]',
    topics: ['crypto', 'defi', 'trading'],
    sentiment: 'neutral',
    confidence: 0.85,
    relevance: 0.75,
  },
};

export type TweetContext = typeof mockTweetContext;
