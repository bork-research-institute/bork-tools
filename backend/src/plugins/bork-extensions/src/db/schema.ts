import type { Pool } from 'pg';

export interface Account {
  id: string;
  createdAt: Date;
  name?: string;
  username?: string;
  email: string;
  avatarUrl?: string;
  details: Record<string, unknown>;
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

export interface Tweet {
  id: string;
  content: string;
  status: string;
  createdAt: Date;
  scheduledFor?: Date;
  sentAt?: Date;
  error?: string;
  agentId?: string;
  prompt?: string;
  homeTimeline?: Record<string, unknown>;
  newTweetContent?: string;
  mediaType: string;
  mediaUrl?: string;
}

export interface TweetAnalysis {
  tweet_id: string;
  type: string;
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
}

export interface AgentPrompt {
  id: string;
  prompt: string;
  agentId: string;
  version: string;
  enabled: boolean;
}

export interface TopicWeight {
  topic: string;
  weight: number;
  impactScore: number;
  lastUpdated: Date;
}

export interface TopicWeightRow {
  topic: string;
  weight: number;
  impact_score: number;
  last_updated: Date;
  seed_weight: number;
}

export const createTables = async (db: Pool) => {
  // ... existing tables ...

  await db.query(`
    CREATE TABLE IF NOT EXISTS topic_weights (
      topic TEXT PRIMARY KEY,
      weight DOUBLE PRECISION NOT NULL,
      impact_score DOUBLE PRECISION NOT NULL,
      last_updated TIMESTAMP NOT NULL,
      seed_weight DOUBLE PRECISION NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ... existing code ...
};
