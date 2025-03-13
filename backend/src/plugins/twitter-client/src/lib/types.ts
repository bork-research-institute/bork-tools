export interface TwitterProfile {
  id: string;
  username: string;
  screenName: string;
  bio: string;
  nicknames: string[];
}

export interface TopicWeight {
  topic: string;
  weight: number;
  impactScore: number;
  lastUpdated: number;
  seedWeight: number;
}

export interface TopicWeightRow {
  topic: string;
  weight: number;
  impact_score: number;
  last_updated: Date;
  seed_weight: number;
}

export interface TweetAnalysis {
  spamAnalysis: {
    spamScore: number;
    reasons: string[];
    isSpam: boolean;
  };
  contentAnalysis: {
    type: string;
    sentiment: string;
    confidence: number;
    impactScore: number;
    entities: string[];
    topics: string[];
    metrics: {
      relevance: number;
      quality: number;
      engagement: number;
    };
  };
}

export function convertToTopicWeight(row: TopicWeightRow): TopicWeight {
  return {
    topic: row.topic,
    weight: row.weight,
    impactScore: row.impact_score,
    lastUpdated: row.last_updated.getTime(),
    seedWeight: row.seed_weight,
  };
}
