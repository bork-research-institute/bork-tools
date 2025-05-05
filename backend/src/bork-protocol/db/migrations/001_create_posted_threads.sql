CREATE TABLE IF NOT EXISTS posted_threads (
  id UUID PRIMARY KEY,
  agent_id TEXT NOT NULL,
  primary_topic TEXT NOT NULL,
  related_topics TEXT[] DEFAULT '{}',
  thread_idea TEXT NOT NULL,
  unique_angle TEXT NOT NULL,
  engagement JSONB NOT NULL DEFAULT '{
    "likes": 0,
    "retweets": 0,
    "replies": 0,
    "views": 0
  }',
  performance_score FLOAT NOT NULL DEFAULT 0,
  tweet_ids TEXT[] NOT NULL,
  used_knowledge JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
); 