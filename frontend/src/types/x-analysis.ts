export interface SentimentData {
  score: number;
  trend: 'positive' | 'negative' | 'neutral';
  volume: number;
  timestamp: Date;
}

export interface CommunityHealthMetrics {
  engagementRate: number;
  sentimentScore: number;
  activeUsers: number;
  growthRate: number;
  timestamp: Date;
}

export interface InfluencerProfile {
  username: string;
  influenceScore: number;
  followers: number;
  engagementRate: number;
  topics: string[];
  sentiment: number;
}

export interface ProjectHealth {
  projectName: string;
  sentimentTrend: SentimentData[];
  communityMetrics: CommunityHealthMetrics[];
  topInfluencers: InfluencerProfile[];
  healthScore: number;
}

export interface XAnalysisMetrics {
  communityHealth: number;
  sentimentScore: number;
  activeInfluencers: number;
  engagementRate: number;
}
