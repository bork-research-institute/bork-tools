import { accountTopicQueries, tweetQueries } from '@/extensions/src/db/queries';
import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { selectTargetAccounts } from '../../bork-protocol/utils/selection/select-account';
import { mockTopicWeights } from '../mock-data/mock-topic-weights';
import { mockTopicRelationships } from '../mock-data/topic-relationships';

// Config with realistic limits
const testConfig = {
  search: {
    tweetLimits: {
      accountsToProcess: 5, // Increased to get a better sample
      targetAccounts: 20,
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
      minRetweets: 5,
      minReplies: 2,
    },
  },
  targetAccounts: [] as string[], // Will be populated from DB
};

export interface AccountSelectionTestResult {
  basicSelection: Awaited<ReturnType<typeof selectTargetAccounts>>;
  preferredSelection: Awaited<ReturnType<typeof selectTargetAccounts>>;
  mockTopicWeights: typeof mockTopicWeights;
  mockTopicRelationships: typeof mockTopicRelationships;
  targetAccounts: Awaited<ReturnType<typeof tweetQueries.getTargetAccounts>>;
  yapsData: Awaited<ReturnType<typeof tweetQueries.getYapsForAccounts>>;
  topicAccounts: {
    topic: string;
    accounts: Awaited<ReturnType<typeof accountTopicQueries.getTopicAccounts>>;
  }[];
}

export async function testSelectAccounts(
  runtime: IAgentRuntime,
): Promise<AccountSelectionTestResult> {
  try {
    // Get real target accounts from DB
    const targetAccounts = await tweetQueries.getTargetAccounts();
    elizaLogger.info('[Test] Retrieved target accounts:', {
      count: targetAccounts.length,
      sample: targetAccounts.slice(0, 3).map((a) => ({
        username: a.username,
        influenceScore: a.influenceScore,
      })),
    });

    // Update config with real target accounts
    testConfig.targetAccounts = targetAccounts.map((a) => a.username);

    // Get yaps data for all accounts
    const userIds = targetAccounts.map((a) => a.userId);
    const yapsData = await tweetQueries.getYapsForAccounts(userIds);
    elizaLogger.info('[Test] Retrieved yaps data:', {
      count: yapsData.length,
      sample: yapsData.slice(0, 3).map((y) => ({
        userId: y.userId,
        yapsL24h: y.yapsL24h,
      })),
    });

    // Get topic accounts for relevant topics
    const relevantTopics = mockTopicWeights
      .filter((tw) => tw.weight > 0.5) // Focus on high-weight topics
      .map((tw) => tw.topic);

    const topicAccounts = await Promise.all(
      relevantTopics.map(async (topic) => ({
        topic,
        accounts: await accountTopicQueries.getTopicAccounts(topic),
      })),
    );

    elizaLogger.info('[Test] Retrieved topic accounts:', {
      topicCount: topicAccounts.length,
      sample: topicAccounts.slice(0, 2).map((ta) => ({
        topic: ta.topic,
        accountCount: ta.accounts.length,
        sampleAccounts: ta.accounts.slice(0, 2).map((a) => ({
          username: a.username,
          mentionCount: a.mentionCount,
        })),
      })),
    });

    // Test without preferred topic
    elizaLogger.info('[Test] Running basic selection test');
    const basicSelection = await selectTargetAccounts(runtime, testConfig, 24);
    elizaLogger.info('[Test] Basic selection results:', {
      count: basicSelection.length,
      accounts: basicSelection.map((a) => ({
        username: a.username,
        influenceScore: targetAccounts.find((ta) => ta.userId === a.userId)
          ?.influenceScore,
        yaps: yapsData.find((y) => y.userId === a.userId)?.yapsL24h,
      })),
    });

    // Test with preferred topic
    const preferredTopic = relevantTopics[0]; // Use first high-weight topic
    elizaLogger.info(
      `[Test] Running preferred topic selection test with topic: "${preferredTopic}"`,
    );
    const preferredSelection = await selectTargetAccounts(
      runtime,
      testConfig,
      24,
      preferredTopic,
    );
    elizaLogger.info('[Test] Preferred selection results:', {
      preferredTopic,
      count: preferredSelection.length,
      accounts: preferredSelection.map((a) => ({
        username: a.username,
        influenceScore: targetAccounts.find((ta) => ta.userId === a.userId)
          ?.influenceScore,
        yaps: yapsData.find((y) => y.userId === a.userId)?.yapsL24h,
        topicMentions:
          topicAccounts
            .find((ta) => ta.topic === preferredTopic)
            ?.accounts.find((acc) => acc.username === a.username)
            ?.mentionCount || 0,
      })),
    });

    return {
      basicSelection,
      preferredSelection,
      mockTopicWeights,
      mockTopicRelationships,
      targetAccounts,
      yapsData,
      topicAccounts,
    };
  } catch (error) {
    elizaLogger.error('[Test] Error in account selection test:', error);
    throw error;
  }
}
