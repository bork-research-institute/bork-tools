import type { DatabaseTweet } from 'src/bork-protocol/types/twitter';

// FIXME: This needs to be split into multiple files
export interface Account {
  id: string;
  createdAt: Date;
  name?: string;
  username?: string;
  email: string;
  avatarUrl?: string;
  details: Record<string, unknown>;
}

export interface TargetAccount {
  username: string;
  userId: string;
  displayName: string;
  description: string;
  followersCount: number;
  followingCount: number;
  friendsCount: number;
  mediaCount: number;
  statusesCount: number;
  likesCount: number;
  listedCount: number;
  tweetsCount: number;
  isPrivate: boolean;
  isVerified: boolean;
  isBlueVerified: boolean;
  joinedAt: Date | null;
  location: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  websiteUrl: string | null;
  canDm: boolean;
  createdAt: Date;
  lastUpdated: Date;
  isActive: boolean;
  source: string;
}

export interface YapsData {
  id: number;
  userId: string;
  username: string;
  yapsAll: number;
  yapsL24h: number;
  yapsL48h: number;
  yapsL7d: number;
  yapsL30d: number;
  yapsL3m: number;
  yapsL6m: number;
  yapsL12m: number;
  lastUpdated: Date;
  createdAt: Date;
}

export interface AgentSetting {
  id: string;
  agentId: string;
  settingKey: string;
  settingValue?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Cache {
  key: string;
  agentId: string;
  value: Record<string, unknown>;
  createdAt: Date;
  expiresAt?: Date;
}

export interface ConsciousnessStream {
  id: string;
  agentId?: string;
  topic: string;
  title: string;
  content: Record<string, unknown>;
  status: string;
  timestamp: Date;
}

export interface Goal {
  id: string;
  createdAt: Date;
  userId: string;
  name?: string;
  status?: string;
  description?: string;
  roomId: string;
  objectives: Array<{
    id: string;
    title: string;
    completed: boolean;
    description?: string;
  }>;
}

export interface Log {
  id: string;
  createdAt: Date;
  userId: string;
  body: Record<string, unknown>;
  type: string;
  roomId?: string;
}

export interface Memory {
  id: string;
  type: string;
  createdAt: Date;
  content: Record<string, unknown>;
  embedding?: string;
  userId?: string;
  agentId?: string;
  roomId?: string;
  unique: boolean;
}

export interface Participant {
  id: string;
  createdAt: Date;
  userId: string;
  roomId: string;
  userState?: string;
  lastMessageRead?: string;
}

export interface Relationship {
  id: string;
  createdAt: Date;
  userA: string;
  userB: string;
  status?: string;
  userId: string;
}

export interface Room {
  id: string;
  createdAt: Date;
}

export interface StreamSetting {
  id: string;
  agentId?: string;
  enabled: boolean;
  interval: number;
  lastRun: Date;
}

// Re-export Tweet type directly
export type { DatabaseTweet as Tweet };

export interface TweetAnalysis {
  tweet_id: string;
  type: string;
  format: string;
  sentiment: string;
  confidence: number;
  metrics: Record<string, unknown>;
  entities: string[];
  topics: string[];
  impact_score: number;
  created_at: Date;
  author_id: string;
  tweet_text: string;
  public_metrics: Record<string, unknown>;
  raw_entities: Record<string, unknown>;
  content_metrics: {
    relevance: number;
    quality: number;
    engagement: number;
    authenticity: number;
    valueAdd: number;
    callToActionEffectiveness?: number;
    trendAlignmentScore?: number;
  };
  spam_analysis: {
    spamScore: number;
    reasons: string[];
    isSpam: boolean;
    confidenceMetrics: {
      linguisticRisk: number;
      topicMismatch: number;
      engagementAnomaly: number;
      promotionalIntent: number;
      accountTrustSignals: number;
    };
  };
  marketing_insights?: {
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
      callToAction: {
        present: boolean;
        type: string;
        effectiveness: number;
      };
    };
  };
}

export interface AgentPrompt {
  id: string;
  prompt: string;
  agentId: string;
  version: string;
  enabled: boolean;
}

export interface TopicWeight {
  id: string;
  topic: string;
  weight: number;
  impactScore: number;
  timestamp: Date;
  engagementMetrics: {
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
  tweetId: string;
}

export interface TopicWeightRow {
  id: string;
  topic: string;
  weight: number;
  impact_score: number;
  timestamp: Date;
  engagement_metrics: {
    likes: number;
    retweets: number;
    replies: number;
    virality: number;
    conversion_potential: number;
    community_building: number;
    thought_leadership: number;
  };
  sentiment: string;
  confidence: number;
  tweet_id: string;
  created_at?: Date;
}
