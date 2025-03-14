export interface SpamAnalysis {
  spamScore: number;
  reasons: string[];
  isSpam: boolean;
  confidenceMetrics: {
    linguisticRisk: number;
    topicMismatch: number;
    engagementAnomaly: number;
    promotionalIntent: number;
  };
}

export interface ContentAnalysis {
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
    authenticity: number;
    valueAdd: number;
  };
}

export interface TweetAnalysis {
  spamAnalysis: SpamAnalysis;
  contentAnalysis: ContentAnalysis;
}
