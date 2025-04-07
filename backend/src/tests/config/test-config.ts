import type { IAgentRuntime } from '@elizaos/core';

// Test enable/disable flags
export const TEST_FLAGS = {
  TOPIC_RELATIONSHIPS: false,
  TOPIC_SELECTION: true,
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
        '../utils/topic-selection-test-utils'
      );
      return testSelectTopics(runtime);
    },
    description: 'Tests topic selection with and without preferences',
  },
  // Add more tests here as needed
];
