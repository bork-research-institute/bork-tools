import type { DatabaseTweet } from '@/types/twitter';

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
    clarity: number;
    authenticity: number;
    valueAdd: number;
  };
  spam_analysis: {
    spamScore: number;
    isSpam: boolean;
  };
  marketing_analysis: {
    summary: string;
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

export interface AccountTopic {
  username: string;
  topic: string;
  mentionCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

// Database row mapping types for db/queries.ts
export interface DatabaseTargetAccount {
  username: string;
  user_id: string;
  display_name: string;
  description: string;
  followers_count: number;
  following_count: number;
  friends_count: number;
  media_count: number;
  statuses_count: number;
  likes_count: number;
  listed_count: number;
  tweets_count: number;
  is_private: boolean;
  is_verified: boolean;
  is_blue_verified: boolean;
  joined_at: Date;
  location: string;
  avatar_url: string;
  banner_url: string;
  website_url: string;
  can_dm: boolean;
  created_at: Date;
  last_updated: Date;
  is_active: boolean;
  source: string;
  avg_likes_50: number;
  avg_retweets_50: number;
  avg_replies_50: number;
  avg_views_50: number;
  engagement_rate_50: number;
  influence_score: number;
  last_50_tweets_updated_at: Date | null;
}

export interface DatabaseAgentPrompt {
  id: string;
  prompt: string;
  agent_id: string;
  version: string;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DatabaseStreamSetting {
  id: string;
  agent_id: string;
  enabled: boolean;
  interval: number;
  last_run: Date;
}

export interface DatabaseMentionRelationship {
  username: string;
  strength: number;
}

export interface DatabaseStrongRelationship {
  source_username: string;
  target_username: string;
  strength: number;
}

export interface DatabaseTopicWeightTrend {
  topic: string;
  timestamp: Date;
  avg_weight: number;
  total_engagement: number;
  mention_count: number;
  momentum?: number;
}

export interface SpamUser {
  user_id: string;
  spam_score: number;
  last_tweet_date: Date;
  tweet_count: number;
  violations: string[];
  updated_at: Date;
}
