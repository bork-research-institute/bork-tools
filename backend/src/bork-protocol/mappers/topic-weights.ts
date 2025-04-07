import type { TopicRelationshipAnalysis } from '@/types/response/topic-relationship';
import { RELATIONSHIP_TYPES } from '@/types/response/topic-relationship';
import type { TopicWeight } from '@/types/topic';
import type { TopicWeightRow } from '@/types/topic';

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
  return topicWeights
    .map((tw) => {
      const relationship = analysis.relatedTopics.find(
        (r) => r.topic === tw.topic,
      );

      if (
        !relationship ||
        relationship.relevanceScore < RELATIONSHIP_TYPES.moderate.min ||
        relationship.relationshipType === 'none'
      ) {
        return { ...tw, weight: 0 };
      }

      // Calculate weight based on relationship strength and analysis confidence
      // Direct/strong relationships get higher weight multipliers
      const relationshipMultiplier =
        relationship.relationshipType === 'direct'
          ? 0.6
          : relationship.relationshipType === 'strong'
            ? 0.5
            : 0.4;

      return {
        ...tw,
        weight:
          tw.weight * (1 - relationshipMultiplier) +
          relationship.relevanceScore * relationshipMultiplier +
          analysis.analysisMetadata.confidence * 0.2,
      };
    })
    .filter((tw) => tw.weight > 0);
}
