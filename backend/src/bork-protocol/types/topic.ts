// FIXME: This is duplicated in bork-extensions, need to find a way to share this

export interface TopicWeight {
  topic: string;
  weight: number;
  impactScore: number;
  lastUpdated: Date;
  seedWeight: number;
}

export interface TopicWeightRow {
  id: string;
  topic: string;
  weight: number;
  impact_score: number;
  created_at: Date;
  engagement_metrics: {
    likes: number;
    retweets: number;
    replies: number;
    quality_metrics: {
      relevance: number;
      originality: number;
      clarity: number;
      authenticity: number;
      valueAdd: number;
    };
  };
  sentiment: string;
  confidence: number;
  tweet_id: string;
}

export interface EngagementMetrics {
  likes: number;
  retweets: number;
  replies: number;
  quality_metrics: {
    relevance: number;
    originality: number;
    clarity: number;
    authenticity: number;
    valueAdd: number;
  };
}
