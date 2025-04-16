import type { TwitterConfig } from '@/types/config';
import type { Character, IAgentRuntime } from '@elizaos/core';
import { ModelProviderName, stringToUuid } from '@elizaos/core';

// Test enable/disable flags
export const TEST_FLAGS = {
  TOPIC_RELATIONSHIPS: false,
  TOPIC_SELECTION: false,
  ACCOUNT_SELECTION: false,
  TWEET_SELECTION: false,
  TWEET_PROCESSING: false,
  INFLUENCE_SCORE: false,
  TWEET_CONTEXT: true,
  // Add more flags here as needed
} as const;

export interface TestResult {
  success: boolean;
  error?: Error;
  data?: unknown;
}

export interface TestConfig {
  name: string;
  enabled: boolean;
  testFn: (runtime: IAgentRuntime) => Promise<unknown>;
  description: string;
}

export const testCharacter: Character = {
  id: stringToUuid('test-agent'),
  name: 'Test Agent',
  username: 'test-agent',
  modelProvider: ModelProviderName.OPENAI,
  system: 'You are a test agent.',
  plugins: [],
  settings: {
    secrets: {},
  },
  bio: ['Test agent for unit testing'],
  lore: ['Created for testing Eliza agent functionality'],
  messageExamples: [],
  postExamples: [],
  adjectives: ['helpful', 'precise'],
  topics: ['testing', 'agents'],
  style: {
    all: ['be concise', 'be helpful'],
    chat: ['respond clearly'],
    post: ['write clearly'],
  },
};

export const testTwitterConfig: TwitterConfig = {
  search: {
    tweetLimits: {
      accountsToProcess: 5,
      targetAccounts: 5,
      qualityTweetsPerAccount: 5,
    },
    parameters: {
      lang: 'en',
      maxResults: 100,
      filterLevel: 'medium' as const,
      excludeReplies: true,
      excludeRetweets: true,
      includeQuotes: false,
      includeThreads: false,
    },
    engagementThresholds: {
      minLikes: 10,
      minRetweets: 1,
      minReplies: 1,
    },
  },
  targetAccounts: [],
};

export const testConfig: TestConfig[] = [
  {
    name: 'topic-relationships',
    enabled: TEST_FLAGS.TOPIC_RELATIONSHIPS,
    testFn: async (runtime) => {
      const { testGetRelatedTopics } = await import(
        '../clients/get-related-topics.test'
      );
      return testGetRelatedTopics(runtime);
    },
    description: 'Tests topic relationship analysis functionality',
  },
  {
    name: 'topic-selection',
    enabled: TEST_FLAGS.TOPIC_SELECTION,
    testFn: async (runtime) => {
      const { testSelectTopics } = await import(
        '../clients/select-topics.test'
      );
      return testSelectTopics(runtime);
    },
    description:
      'Tests topic selection with weight adjustments and relationships',
  },
  {
    name: 'account-selection',
    enabled: TEST_FLAGS.ACCOUNT_SELECTION,
    testFn: async (runtime) => {
      const { testSelectAccounts } = await import(
        '../clients/select-accounts.test'
      );
      return testSelectAccounts(runtime);
    },
    description: 'Tests account selection with real data and topic preferences',
  },
  {
    name: 'tweet-selection',
    enabled: TEST_FLAGS.TWEET_SELECTION,
    testFn: async (runtime) => {
      const { testSelectTweetsFromAccounts } = await import(
        '../clients/select-tweets-from-accounts.test'
      );
      return testSelectTweetsFromAccounts(runtime);
    },
    description:
      'Tests tweet selection from accounts based on engagement criteria',
  },
  {
    name: 'tweet-processing',
    enabled: TEST_FLAGS.TWEET_PROCESSING,
    testFn: async (runtime) => {
      const { testFetchUpstreamTweets } = await import(
        '../clients/fetch-upstream-tweets.test'
      );
      return testFetchUpstreamTweets(runtime);
    },
    description:
      'Tests tweet validation, preparation, and merging with related tweets',
  },
  {
    name: 'influence-score',
    enabled: TEST_FLAGS.INFLUENCE_SCORE,
    testFn: async (_runtime) => {
      const { testUpdateInfluenceScore } = await import(
        '../clients/update-influence-score.test'
      );
      return testUpdateInfluenceScore();
    },
    description:
      'Tests influence score calculation and updates for target accounts',
  },
  {
    name: 'tweet-context',
    enabled: TEST_FLAGS.TWEET_CONTEXT,
    testFn: async (runtime) => {
      const { testTweetContextPreparation } = await import(
        '../clients/process-single-tweet-context.test'
      );
      return testTweetContextPreparation(runtime);
    },
    description:
      'Tests tweet context preparation including template generation, memory state, and knowledge fetching',
  },
  // Add more tests here as needed
];
