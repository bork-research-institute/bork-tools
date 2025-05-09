import type { TweetAnalysis as ResponseTweetAnalysis } from './response/tweet-analysis';

export interface SpamAnalysis {
  isSpam: boolean;
  spamScore: number;
}

export interface QualityMetrics {
  relevance: number;
  originality: number;
  clarity: number;
  authenticity: number;
  valueAdd: number;
}

export interface EngagementAnalysis {
  overallScore: number;
  virality: number;
  conversionPotential: number;
  communityBuilding: number;
  thoughtLeadership: number;
}

export interface Entities {
  people: string[];
  organizations: string[];
  products: string[];
  locations: string[];
  events: string[];
}

export interface ContentAnalysis {
  type: string;
  format: string;
  sentiment: string;
  confidence: number;
  summary: string;
  topics: string[];
  entities: string[];
  qualityMetrics: QualityMetrics;
}

export interface CallToAction {
  present: boolean;
  type: string;
  effectiveness: number;
}

export interface MarketingInsights {
  targetAudience: string[];
  keyTakeaways: string[];
  contentStrategies: {
    whatWorked: string[];
    improvement: string[];
  };
  trendAlignment: {
    currentTrends: string[];
    emergingOpportunities: string[];
    relevanceScore: number;
  };
  copywriting: {
    effectiveElements: string[];
    hooks: string[];
    callToAction: CallToAction;
  };
}

export interface EngagementStrategy {
  action: string;
  rationale: string;
  priority: 'high' | 'medium' | 'low';
  expectedOutcome: string;
}

export interface ContentCreation {
  contentType: string;
  focus: string;
  keyElements: string[];
}

export interface NetworkBuilding {
  targetType: string;
  target: string;
  approach: string;
  value: string;
}

export interface ActionableRecommendations {
  engagementStrategies: EngagementStrategy[];
  contentCreation: ContentCreation[];
  networkBuilding: NetworkBuilding[];
}

export interface MarketingAnalysis {
  summary: string;
}

// Re-export the TweetAnalysis type from response
export type TweetAnalysis = ResponseTweetAnalysis;
