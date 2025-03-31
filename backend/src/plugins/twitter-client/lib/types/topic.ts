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
    virality: number;
    conversionPotential: number;
    communityBuilding: number;
    thoughtLeadership: number;
  };
  sentiment: string;
  confidence: number;
  tweet_id: string;
}
