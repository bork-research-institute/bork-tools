import { tweetQueries } from '@/db/queries';
import { hypothesisTemplate } from '@/templates/hypothesis';
import type { HypothesisResponse } from '@/types/response/hypothesis';
import { hypothesisResponseSchema } from '@/types/response/hypothesis';
import {
  type IAgentRuntime,
  type Memory,
  ModelClass,
  type RAGKnowledgeItem,
  elizaLogger,
  generateObject,
  stringToUuid,
} from '@elizaos/core';

/**
 * Fetches knowledge items related to a specific topic
 */
export async function fetchTopicKnowledge(
  runtime: IAgentRuntime,
  topic: string,
  logPrefix = '[Knowledge Fetch]',
): Promise<RAGKnowledgeItem[]> {
  try {
    // Create a memory object for embedding generation
    const memory: Memory = {
      id: stringToUuid(`topic-memory-${topic}`),
      content: {
        text: topic,
      },
      agentId: runtime.agentId,
      userId: stringToUuid('system'),
      roomId: stringToUuid('topic-analysis'),
    };

    // Generate embedding for the topic
    await runtime.messageManager.addEmbeddingToMemory(memory);

    if (!memory.embedding) {
      elizaLogger.warn(
        `${logPrefix} No embedding generated for topic ${topic}, falling back to text search`,
      );
      return [];
    }

    // Convert embedding to Float32Array if needed
    const embedding =
      memory.embedding instanceof Float32Array
        ? memory.embedding
        : new Float32Array(memory.embedding);

    // Search for knowledge items related to the topic
    const knowledge = await runtime.databaseAdapter.searchKnowledge({
      agentId: runtime.agentId,
      embedding,
      match_threshold: 0.7,
      match_count: 10,
      searchText: topic,
    });

    elizaLogger.info(
      `${logPrefix} Found ${knowledge.length} knowledge items for topic ${topic}`,
    );

    return knowledge;
  } catch (error) {
    elizaLogger.error(
      `${logPrefix} Error fetching knowledge for topic ${topic}:`,
      {
        error: error instanceof Error ? error.message : String(error),
      },
    );
    return [];
  }
}

/**
 * Generates hypotheses for growing the X account based on topic performance and knowledge
 */
export async function generateHypothesis(
  runtime: IAgentRuntime,
  timeframeHours = 24,
  logPrefix = '[Hypothesis Generation]',
): Promise<HypothesisResponse> {
  try {
    elizaLogger.info(
      `${logPrefix} Starting hypothesis generation for the last ${timeframeHours} hours`,
    );

    // Get recent topic weights
    const topicWeights =
      await tweetQueries.getRecentTopicWeights(timeframeHours);
    elizaLogger.info(
      `${logPrefix} Found ${topicWeights.length} topic weights to analyze`,
    );

    if (topicWeights.length === 0) {
      throw new Error('No recent topic weights found for analysis');
    }

    // Fetch knowledge for each topic
    const allKnowledge: RAGKnowledgeItem[] = [];
    for (const topicWeight of topicWeights) {
      const topicKnowledge = await fetchTopicKnowledge(
        runtime,
        topicWeight.topic,
        `${logPrefix} [Topic: ${topicWeight.topic}]`,
      );
      allKnowledge.push(...topicKnowledge);
    }

    elizaLogger.info(
      `${logPrefix} Found ${allKnowledge.length} total knowledge items`,
    );

    // Get current account metrics (these would come from your Twitter service)
    // For now using placeholder values - you'll need to implement this
    const currentMetrics = {
      followers: 1000, // Replace with actual follower count
      averageImpressions: 5000, // Replace with actual average impressions
      engagementRate: 0.02, // Replace with actual engagement rate
    };

    // Create the template
    const template = hypothesisTemplate({
      topicWeights,
      topicKnowledge: allKnowledge,
      currentFollowers: currentMetrics.followers,
      averageImpressions: currentMetrics.averageImpressions,
      engagementRate: currentMetrics.engagementRate,
    });

    // Generate hypothesis using the AI
    const { object } = await generateObject({
      runtime,
      context: template.context,
      modelClass: ModelClass.SMALL,
      schema: hypothesisResponseSchema,
    });

    const hypothesis = object as HypothesisResponse;

    elizaLogger.info(`${logPrefix} Successfully generated hypothesis`, {
      numHypotheses: hypothesis.hypotheses.length,
      topicDistribution: hypothesis.overallStrategy.topicDistribution.length,
    });

    return hypothesis;
  } catch (error) {
    elizaLogger.error(`${logPrefix} Error generating hypothesis:`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
