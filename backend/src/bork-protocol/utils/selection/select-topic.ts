import type { TopicWeightRow } from '@/types/topic';
import { elizaLogger } from '@elizaos/core';

/**
 * Selects a topic based on weighted probabilities
 * @param topicWeights - List of topics with their associated weights
 * @returns Selected topic and weight
 */
export function selectTopic(topicWeights: TopicWeightRow[]): TopicWeightRow {
  const totalWeight = topicWeights.reduce((sum, tw) => sum + tw.weight, 0);
  const randomValue = Math.random() * totalWeight;
  let accumWeight = 0;

  const selectedTopic =
    topicWeights.find((tw) => {
      accumWeight += tw.weight;
      return randomValue <= accumWeight;
    }) || topicWeights[0];

  elizaLogger.debug('[TopicSelection] Selected search term based on weights', {
    selectedTopic: selectedTopic.topic,
    weight: selectedTopic.weight,
    allWeights: topicWeights.map((tw) => ({
      topic: tw.topic,
      weight: tw.weight,
    })),
  });

  return selectedTopic;
}
