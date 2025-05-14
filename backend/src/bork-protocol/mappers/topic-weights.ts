import type { TopicWeight } from '@/types/topic';
import type { TopicWeightRow } from '@/types/topic';
import type { TopicRelationshipAnalysis } from '@bork/types/response/topic-relationship';

/**
 * Maps a TopicWeightRow to a TopicWeight
 * @param row The database row to convert
 * @returns Converted TopicWeight
 */
export function mapTopicWeightRowToTopicWeight(
  row: TopicWeightRow,
): TopicWeight {
  return {
    topic: row.topic,
    weight: row.weight,
    impactScore: row.impact_score,
    lastUpdated: row.created_at,
    seedWeight: row.weight, // Using initial weight as seed weight
  };
}

/**
 * Maps topic weights based on their relationship to a preferred topic
 * @param topicWeights Original topic weights
 * @param analysis Topic relationship analysis results
 * @returns Mapped topic weights adjusted by relationship relevance
 */
export function mapTopicWeightsByRelationship(
  topicWeights: TopicWeight[],
  analysis: TopicRelationshipAnalysis,
): TopicWeight[] {
  return topicWeights.map((tw) => {
    const relationship = analysis.relatedTopics.find(
      (r) => r.topic === tw.topic,
    );

    // If no relationship found or relevance is very low, keep minimal weight
    if (!relationship || relationship.relevanceScore < 0.4) {
      return { ...tw, weight: 0.1 }; // Keep minimal weight instead of 0
    }

    // Calculate weight based on relationship strength and analysis confidence
    // Direct/strong relationships get higher weight multipliers
    const relationshipMultiplier =
      relationship.relationshipType === 'direct'
        ? 0.8 // Increased from 0.6
        : relationship.relationshipType === 'strong'
          ? 0.7 // Increased from 0.5
          : 0.6; // Increased from 0.4

    // Adjust weight calculation to give more importance to relevance score
    const adjustedWeight =
      tw.weight * (1 - relationshipMultiplier) + // Original weight component
      relationship.relevanceScore * relationshipMultiplier + // Relationship component
      analysis.analysisMetadata.confidence * 0.2; // Confidence component

    return {
      ...tw,
      weight: Math.max(0.1, adjustedWeight), // Ensure minimum weight of 0.1
    };
  });
  // Remove the filter to keep all topics
}
