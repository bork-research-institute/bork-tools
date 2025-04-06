import type { TopicWeightRow } from '@/types/topic';
import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { getAggregatedTopicWeights } from '../topic-weights/topics';
import { analyzeTopicRelationships } from './analyze-topic-relationships';

/**
 * Selects a topic based on weighted probabilities, optionally considering a preferred topic
 * @param runtime - Agent runtime for AI operations
 * @param timeframeHours - Number of hours to look back for topic weights
 * @param preferredTopic - Optional topic to bias selection towards related topics
 * @returns Selected topic and weight
 */
export async function selectTopic(
  runtime: IAgentRuntime,
  timeframeHours = 24,
  preferredTopic?: string,
): Promise<TopicWeightRow> {
  // Get aggregated topic weights from recent data
  const topicWeights = await getAggregatedTopicWeights(timeframeHours);

  if (topicWeights.length === 0) {
    throw new Error('No topics available for selection');
  }

  // If no preferred topic, just do regular weighted selection
  if (!preferredTopic) {
    return performWeightedSelection(topicWeights);
  }

  try {
    // Analyze relationships between available topics and preferred topic
    const analysis = await analyzeTopicRelationships(
      runtime,
      topicWeights.map((tw) => tw.topic),
      preferredTopic,
    );

    // Adjust weights based on topic relationships and confidence
    const adjustedWeights = topicWeights.map((tw) => {
      const relationship = analysis.relatedTopics.find(
        (r) => r.topic === tw.topic,
      );

      // Filter out topics with low relevance or unrelated topics
      if (
        !relationship ||
        relationship.relevanceScore < 0.4 ||
        relationship.relationshipType === 'none'
      ) {
        return {
          ...tw,
          weight: 0, // Zero weight means it won't be selected
        };
      }

      // Weight adjustment factors:
      // - Base weight: 30%
      // - Relationship score: 50%
      // - Analysis confidence: 20%
      const baseWeight = tw.weight * 0.3;
      const relationshipWeight = relationship.relevanceScore * 0.5;
      const confidenceWeight = analysis.analysisMetadata.confidence * 0.2;

      return {
        ...tw,
        weight: baseWeight + relationshipWeight + confidenceWeight,
      };
    });

    // Filter out topics with zero weight
    const validWeights = adjustedWeights.filter((tw) => tw.weight > 0);

    if (validWeights.length === 0) {
      elizaLogger.warn(
        '[TopicSelection] No sufficiently related topics found, using preferred topic',
        { preferredTopic },
      );
      // If no related topics meet the threshold, use the preferred topic
      return {
        ...topicWeights[0],
        topic: preferredTopic,
        weight: 1,
      };
    }

    elizaLogger.debug('[TopicSelection] Adjusted weights:', {
      adjustments: validWeights.map((w) => ({
        topic: w.topic,
        originalWeight: topicWeights.find((tw) => tw.topic === w.topic)?.weight,
        adjustedWeight: w.weight,
        relationship: analysis.relatedTopics.find((r) => r.topic === w.topic)
          ?.relationshipType,
      })),
    });

    return performWeightedSelection(validWeights);
  } catch (error) {
    elizaLogger.warn(
      '[TopicSelection] Error in relationship analysis, falling back to basic selection:',
      {
        error: error instanceof Error ? error.message : String(error),
      },
    );
    return performWeightedSelection(topicWeights);
  }
}

/**
 * Performs weighted random selection from a list of topics
 */
function performWeightedSelection(
  topicWeights: TopicWeightRow[],
): TopicWeightRow {
  const totalWeight = topicWeights.reduce((sum, tw) => sum + tw.weight, 0);
  const randomValue = Math.random() * totalWeight;
  let accumWeight = 0;

  const selectedTopic =
    topicWeights.find((tw) => {
      accumWeight += tw.weight;
      return randomValue <= accumWeight;
    }) || topicWeights[0];

  elizaLogger.debug('[TopicSelection] Selected topic based on weights', {
    selectedTopic: selectedTopic.topic,
    weight: selectedTopic.weight,
    allWeights: topicWeights.map((tw) => ({
      topic: tw.topic,
      weight: tw.weight,
    })),
  });

  return selectedTopic;
}
