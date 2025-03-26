import { elizaLogger } from '@elizaos/core';
import { tweetQueries } from '../../../bork-extensions/src/db/queries.js';
import type { TopicWeightRow } from '../types/topic.js';

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
  if (!tweetTopics || tweetTopics.length === 0) {
    elizaLogger.debug(`${context} No topics to process, skipping`);
    return;
  }

  try {
    // Create a map of current weights for easy lookup
    const weightMap = new Map(currentWeights.map((tw) => [tw.topic, tw]));

    // Collect all updates to perform them in a batch if possible
    const updates = [];

    // Process each topic found in the tweet
    for (const topic of tweetTopics) {
      if (!topic || typeof topic !== 'string') {
        elizaLogger.warn(`${context} Invalid topic found, skipping`);
        continue;
      }

      const currentWeight = weightMap.get(topic);

      if (currentWeight) {
        // For existing topics:
        // 1. Apply very small decay (0.1%)
        // 2. Add 0.01 for being mentioned
        const decayFactor = 0.999; // 0.1% decay
        const mentionBonus = 0.01; // Fixed increase for being mentioned
        const newWeight = currentWeight.weight * decayFactor + mentionBonus;

        // Ensure weight stays between 0 and 1
        const normalizedWeight = Math.max(0, Math.min(1, newWeight));

        updates.push({
          topic,
          weight: normalizedWeight,
          impactScore,
          seedWeight: currentWeight.seed_weight,
          isNew: false,
          oldWeight: currentWeight.weight,
        });
      } else {
        // For new topics, initialize with seed weight of 0.5
        const seedWeight = 0.5;
        updates.push({
          topic,
          weight: seedWeight,
          impactScore,
          seedWeight,
          isNew: true,
        });
      }
    }

    // Perform updates
    for (const update of updates) {
      try {
        await tweetQueries.updateTopicWeight(
          update.topic,
          update.weight,
          update.impactScore,
          update.seedWeight,
        );

        if (update.isNew) {
          elizaLogger.info(
            `${context} Added new topic ${update.topic} with seed weight ${update.seedWeight}`,
          );
        } else {
          elizaLogger.debug(
            `${context} Updated weight for existing topic ${update.topic}`,
            {
              oldWeight: update.oldWeight,
              newWeight: update.weight,
              impactScore,
            },
          );
        }
      } catch (updateError) {
        elizaLogger.error(`${context} Error updating topic ${update.topic}:`, {
          error:
            updateError instanceof Error
              ? updateError.message
              : String(updateError),
          topic: update.topic,
        });
        // Continue with other updates even if one fails
      }
    }

    elizaLogger.info(`${context} Updated weights for ${updates.length} topics`);
  } catch (error) {
    elizaLogger.error(`${context} Error updating topic weights:`, {
      error: error instanceof Error ? error.message : String(error),
      tweetTopics,
    });
    // Don't re-throw the error to prevent process termination
  }
}
