import { elizaLogger } from '@elizaos/core';
import { tweetQueries } from '../../../bork-extensions/src/db/queries.js';
import type { TopicWeightRow } from '../../types/topic';

/**
 * Updates topic weights based on tweet analysis
 * @param currentWeights Current topic weights
 * @param tweetTopics Topics found in the tweet
 * @param impactScore Impact score of the tweet
 * @param context The logging context
 */
export async function updateTopicWeights(
  currentWeights: TopicWeightRow[],
  tweetTopics: string[],
  impactScore: number,
  context: string,
): Promise<void> {
  try {
    // Create a map of current weights for easy lookup
    const weightMap = new Map(currentWeights.map((tw) => [tw.topic, tw]));

    // Update weights for each topic found in the tweet
    for (const topic of tweetTopics) {
      const currentWeight = weightMap.get(topic);
      if (currentWeight) {
        // Calculate new weight with decay factor
        const decayFactor = 0.9; // 10% decay
        const learningRate = 0.1; // 10% learning rate
        const newWeight =
          currentWeight.weight * decayFactor + impactScore * learningRate;

        // Ensure weight stays between 0 and 1
        const normalizedWeight = Math.max(0, Math.min(1, newWeight));

        await tweetQueries.updateTopicWeight(
          topic,
          normalizedWeight,
          impactScore,
          currentWeight.seed_weight,
        );

        elizaLogger.debug(`${context} Updated weight for topic ${topic}`, {
          oldWeight: currentWeight.weight,
          newWeight: normalizedWeight,
          impactScore,
        });
      }
    }

    elizaLogger.info(
      `${context} Updated weights for ${tweetTopics.length} topics`,
    );
  } catch (error) {
    elizaLogger.error(`${context} Error updating topic weights:`, {
      error: error instanceof Error ? error.message : String(error),
      tweetTopics,
    });
    throw error;
  }
}
