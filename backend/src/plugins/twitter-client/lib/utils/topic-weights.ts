import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { tweetQueries } from '../../../bork-extensions/src/db/queries';
import type { TopicWeightRow } from '../types/topic';

export async function initializeTopicWeights(
  runtime: IAgentRuntime,
): Promise<TopicWeightRow[]> {
  try {
    const topicWeights = await tweetQueries.getTopicWeights();

    if (topicWeights.length) {
      elizaLogger.info(
        `[TwitterAccounts] Found ${topicWeights.length} existing topic weights`,
      );
      return topicWeights;
    }

    const defaultTopics = runtime.character.topics || [
      'injective protocol',
      'DeFi',
      'cryptocurrency',
      'blockchain',
      'market analysis',
    ];

    await tweetQueries.initializeTopicWeights(defaultTopics);
    elizaLogger.info(
      `[TwitterAccounts] Initialized ${defaultTopics.length} default topics`,
    );

    // Reload the topic weights
    const newTopicWeights = await tweetQueries.getTopicWeights();

    if (!newTopicWeights.length) {
      elizaLogger.error('[TwitterAccounts] Failed to initialize topic weights');
      throw new Error('Failed to initialize topic weights');
    }

    return newTopicWeights;
  } catch (error) {
    elizaLogger.error(
      '[TwitterAccounts] Error initializing topic weights:',
      error,
    );
    throw error;
  }
}
