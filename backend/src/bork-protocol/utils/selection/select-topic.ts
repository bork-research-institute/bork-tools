import type { TopicWeightRow } from '@/types/topic';
import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { analyzeTopicRelationships } from '../generate-ai-object/generate-related-topics';
import { getAggregatedTopicWeights } from '../topic-weights/topics';

/**
 * Selects topics based on weighted probabilities, optionally considering a preferred topic
 * @param runtime - Agent runtime for AI operations
 * @param timeframeHours - Number of hours to look back for topic weights
 * @param preferredTopic - Optional topic to bias selection towards related topics
 * @param numTopics - Number of topics to return (default: 1)
 * @returns Array of selected topics and weights
 */
export async function selectTopic(
  runtime: IAgentRuntime,
  timeframeHours = 24,
  preferredTopic?: string,
  numTopics = 1,
): Promise<TopicWeightRow[]> {
  // Get aggregated topic weights from recent data
  const topicWeights = await getAggregatedTopicWeights(timeframeHours);

  if (topicWeights.length === 0) {
    elizaLogger.warn(
      '[TopicSelection] No topics available, using default crypto topic',
    );
    return [
      {
        topic: 'cryptocurrency',
        weight: 1,
        impact_score: 0.5,
        created_at: new Date(),
        id: '',
        tweet_id: '',
        sentiment: 'neutral',
        confidence: 0.5,
        engagement_metrics: {
          likes: 0,
          retweets: 0,
          replies: 0,
          quality_metrics: {
            relevance: 0.5,
            originality: 0.5,
            clarity: 0.5,
            authenticity: 0.5,
            valueAdd: 0.5,
          },
        },
      },
    ];
  }

  // If no preferred topic, just do regular weighted selection
  if (!preferredTopic) {
    return performWeightedSelection(topicWeights, numTopics);
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
      return [
        {
          ...topicWeights[0],
          topic: preferredTopic,
          weight: 1,
        },
      ];
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

    return performWeightedSelection(validWeights, numTopics);
  } catch (error) {
    elizaLogger.warn(
      '[TopicSelection] Error in relationship analysis, falling back to basic selection:',
      {
        error: error instanceof Error ? error.message : String(error),
      },
    );
    return performWeightedSelection(topicWeights, numTopics);
  }
}

/**
 * Performs weighted random selection from a list of topics
 */
function performWeightedSelection(
  topicWeights: TopicWeightRow[],
  numTopics = 1,
): TopicWeightRow[] {
  const selectedTopics: TopicWeightRow[] = [];
  const remainingTopics = [...topicWeights];

  for (let i = 0; i < numTopics && remainingTopics.length > 0; i++) {
    const totalWeight = remainingTopics.reduce((sum, tw) => sum + tw.weight, 0);
    const randomValue = Math.random() * totalWeight;
    let accumWeight = 0;

    const selectedIndex = remainingTopics.findIndex((tw) => {
      accumWeight += tw.weight;
      return randomValue <= accumWeight;
    });

    if (selectedIndex !== -1) {
      const selectedTopic = remainingTopics[selectedIndex];
      selectedTopics.push(selectedTopic);
      // Remove selected topic to avoid duplicates
      remainingTopics.splice(selectedIndex, 1);
    }
  }

  elizaLogger.debug('[TopicSelection] Selected topics based on weights', {
    selectedTopics: selectedTopics.map((tw) => ({
      topic: tw.topic,
      weight: tw.weight,
    })),
    requestedCount: numTopics,
    actualCount: selectedTopics.length,
  });

  return selectedTopics;
}
