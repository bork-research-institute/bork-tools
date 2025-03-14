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
  tweet_id: string;
  content: string;
  text: string;
  status: string;
  createdAt: Date;
  scheduledFor?: Date;
  sentAt?: Date;
  error?: string;
  agentId?: string;
  prompt?: string;
  bookmarkCount?: number;
  conversationId?: string;
  hashtags: string[];
  html?: string;
  inReplyToStatusId?: string;
  isQuoted: boolean;
  isPin: boolean;
  isReply: boolean;
  isRetweet: boolean;
  isSelfThread: boolean;
  likes: number;
  name?: string;
  mentions: Array<{ username: string; id: string }>;
  permanentUrl: string;
  photos: Array<{ url: string }>;
  quotedStatusId?: string;
  replies: number;
  retweets: number;
  retweetedStatusId?: string;
  timestamp: number;
  urls: string[];
  userId: string;
  username: string;
  views?: number;
  sensitiveContent: boolean;
  mediaType: string;
  mediaUrl?: string;
  homeTimeline?: Record<string, unknown>;
  newTweetContent?: string;
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
  await db.query(`
    CREATE TABLE IF NOT EXISTS tweets (
      id UUID PRIMARY KEY,
      tweet_id TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      text TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL,
      scheduled_for TIMESTAMP,
      sent_at TIMESTAMP,
      error TEXT,
      agent_id UUID,
      prompt TEXT,
      bookmark_count INTEGER,
      conversation_id TEXT,
      hashtags TEXT[],
      html TEXT,
      in_reply_to_status_id TEXT,
      is_quoted BOOLEAN NOT NULL DEFAULT false,
      is_pin BOOLEAN NOT NULL DEFAULT false,
      is_reply BOOLEAN NOT NULL DEFAULT false,
      is_retweet BOOLEAN NOT NULL DEFAULT false,
      is_self_thread BOOLEAN NOT NULL DEFAULT false,
      likes INTEGER NOT NULL DEFAULT 0,
      name TEXT,
      mentions JSONB,
      permanent_url TEXT,
      photos JSONB,
      quoted_status_id TEXT,
      replies INTEGER NOT NULL DEFAULT 0,
      retweets INTEGER NOT NULL DEFAULT 0,
      retweeted_status_id TEXT,
      timestamp BIGINT NOT NULL,
      urls TEXT[],
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      views INTEGER,
      sensitive_content BOOLEAN NOT NULL DEFAULT false,
      media_type TEXT NOT NULL,
      media_url TEXT,
      home_timeline JSONB,
      new_tweet_content TEXT
    );

    CREATE INDEX IF NOT EXISTS tweets_tweet_id_idx ON tweets(tweet_id);
    CREATE INDEX IF NOT EXISTS tweets_user_id_idx ON tweets(user_id);
    CREATE INDEX IF NOT EXISTS tweets_status_idx ON tweets(status);
    CREATE INDEX IF NOT EXISTS tweets_created_at_idx ON tweets(created_at);
  `);

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

  await db.query(`
    CREATE TABLE IF NOT EXISTS tweet_analysis (
      tweet_id UUID PRIMARY KEY REFERENCES tweets(id),
      type TEXT NOT NULL,
      sentiment TEXT NOT NULL,
      confidence DOUBLE PRECISION NOT NULL,
      metrics JSONB NOT NULL,
      entities TEXT[] NOT NULL,
      topics TEXT[] NOT NULL,
      impact_score DOUBLE PRECISION NOT NULL,
      created_at TIMESTAMP NOT NULL,
      author_id TEXT NOT NULL,
      tweet_text TEXT NOT NULL,
      public_metrics JSONB NOT NULL,
      raw_entities JSONB NOT NULL,
      
      -- Spam analysis fields
      spam_score DOUBLE PRECISION NOT NULL,
      spam_reasons TEXT[] NOT NULL,
      is_spam BOOLEAN NOT NULL DEFAULT false,
      linguistic_risk DOUBLE PRECISION NOT NULL,
      topic_mismatch DOUBLE PRECISION NOT NULL,
      engagement_anomaly DOUBLE PRECISION NOT NULL,
      promotional_intent DOUBLE PRECISION NOT NULL,
      
      -- Content quality metrics
      content_relevance DOUBLE PRECISION NOT NULL,
      content_quality DOUBLE PRECISION NOT NULL,
      content_engagement DOUBLE PRECISION NOT NULL,
      content_authenticity DOUBLE PRECISION NOT NULL,
      content_value_add DOUBLE PRECISION NOT NULL
    );

    CREATE INDEX IF NOT EXISTS tweet_analysis_is_spam_idx ON tweet_analysis(is_spam);
    CREATE INDEX IF NOT EXISTS tweet_analysis_spam_score_idx ON tweet_analysis(spam_score);
    CREATE INDEX IF NOT EXISTS tweet_analysis_created_at_idx ON tweet_analysis(created_at);
    CREATE INDEX IF NOT EXISTS tweet_analysis_author_id_idx ON tweet_analysis(author_id);
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_mentions_relationship (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_user_id TEXT NOT NULL,
      target_user_id TEXT NOT NULL,
      mention_count INTEGER NOT NULL DEFAULT 1,
      first_mention_at TIMESTAMP NOT NULL,
      last_mention_at TIMESTAMP NOT NULL,
      tweet_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      relationship_strength DOUBLE PRECISION NOT NULL DEFAULT 0.1,
      is_mutual BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      
      UNIQUE(source_user_id, target_user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_user_mentions_source ON user_mentions_relationship(source_user_id);
    CREATE INDEX IF NOT EXISTS idx_user_mentions_target ON user_mentions_relationship(target_user_id);
    CREATE INDEX IF NOT EXISTS idx_user_mentions_strength ON user_mentions_relationship(relationship_strength);
    CREATE INDEX IF NOT EXISTS idx_user_mentions_mutual ON user_mentions_relationship(is_mutual);
    CREATE INDEX IF NOT EXISTS idx_user_mentions_last_mention ON user_mentions_relationship(last_mention_at);

    -- Trigger to update updated_at
    CREATE OR REPLACE FUNCTION update_user_mentions_relationship_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_update_user_mentions_relationship_timestamp
      BEFORE UPDATE ON user_mentions_relationship
      FOR EACH ROW
      EXECUTE FUNCTION update_user_mentions_relationship_timestamp();

    COMMENT ON TABLE user_mentions_relationship IS 'Tracks relationships between users based on mentions';
    COMMENT ON COLUMN user_mentions_relationship.relationship_strength IS 'Calculated strength of relationship based on mention frequency and recency';
    COMMENT ON COLUMN user_mentions_relationship.is_mutual IS 'Whether both users have mentioned each other';
  `);

  // ... existing code ...
};
