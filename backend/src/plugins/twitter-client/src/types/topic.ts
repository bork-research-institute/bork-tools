export interface TopicWeight {
  topic: string;
  weight: number;
  impactScore: number;
  lastUpdated: Date;
  seedWeight: number;
}

export interface TopicWeightRow {
  topic: string;
  weight: number;
  impact_score: number;
  last_updated: Date;
  seed_weight: number;
}
