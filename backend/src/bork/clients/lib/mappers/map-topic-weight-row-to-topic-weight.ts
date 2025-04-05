import type { TopicWeight, TopicWeightRow } from '../types/topic';

export function mapTopicWeightRowToTopicWeight(
  row: TopicWeightRow,
): TopicWeight {
  return {
    topic: row.topic,
    weight: row.weight,
    impactScore: row.impact_score,
    lastUpdated: new Date(row.last_updated),
    seedWeight: row.seed_weight,
  };
}
