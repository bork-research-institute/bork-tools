CREATE TABLE tweets (
  -- Primary identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id TEXT NOT NULL UNIQUE,
  agent_id UUID NOT NULL,
  
  -- Core tweet data
  text TEXT,
  user_id TEXT,
  username TEXT,
  name TEXT,
  timestamp BIGINT,
  time_parsed TIMESTAMP WITH TIME ZONE,
  
  -- Tweet metrics
  likes INTEGER DEFAULT 0,
  retweets INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  views INTEGER,
  bookmark_count INTEGER,
  
  -- Tweet metadata
  conversation_id TEXT,
  permanent_url TEXT,
  html TEXT,
  
  -- Related tweets (as JSONB to store full tweet objects)
  in_reply_to_status JSONB,
  in_reply_to_status_id TEXT,
  quoted_status JSONB,
  quoted_status_id TEXT,
  retweeted_status JSONB,
  retweeted_status_id TEXT,
  thread JSONB DEFAULT '[]',
  
  -- Tweet flags
  is_quoted BOOLEAN DEFAULT FALSE,
  is_pin BOOLEAN DEFAULT FALSE,
  is_reply BOOLEAN DEFAULT FALSE,
  is_retweet BOOLEAN DEFAULT FALSE,
  is_self_thread BOOLEAN DEFAULT FALSE,
  sensitive_content BOOLEAN DEFAULT FALSE,
  
  -- Thread handling (our application specific)
  is_thread_merged BOOLEAN DEFAULT FALSE,
  thread_size INTEGER DEFAULT 0,
  original_text TEXT,
  
  -- Media and entities
  media_type TEXT,
  media_url TEXT,
  hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
  mentions JSONB DEFAULT '[]',
  photos JSONB DEFAULT '[]',
  urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  videos JSONB DEFAULT '[]',
  place JSONB,
  poll JSONB,
  
  -- Timeline data
  home_timeline JSONB DEFAULT '{"publicMetrics": {}, "entities": {}}',
  
  -- Processing status (our application specific)
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  prompt TEXT,
  new_tweet_content TEXT
);

-- Indexes for common queries
CREATE INDEX tweets_tweet_id_idx ON tweets(tweet_id);
CREATE INDEX tweets_user_id_idx ON tweets(user_id);
CREATE INDEX tweets_status_idx ON tweets(status);
CREATE INDEX tweets_created_at_idx ON tweets(created_at);
CREATE INDEX tweets_timestamp_idx ON tweets(timestamp);

-- Create tweet_analysis table that references the tweets table
CREATE TABLE tweet_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id TEXT NOT NULL,
  type TEXT NOT NULL,
  format TEXT NOT NULL,
  sentiment TEXT NOT NULL,
  confidence FLOAT NOT NULL,
  metrics JSONB NOT NULL,
  entities JSONB NOT NULL,
  topics JSONB NOT NULL,
  impact_score FLOAT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  author_id TEXT NOT NULL,
  tweet_text TEXT NOT NULL,
  public_metrics JSONB NOT NULL,
  raw_entities JSONB NOT NULL,
  spam_score FLOAT,
  spam_reasons JSONB,
  is_spam BOOLEAN,
  linguistic_risk FLOAT,
  topic_mismatch FLOAT,
  engagement_anomaly FLOAT,
  promotional_intent FLOAT,
  account_trust_signals FLOAT,
  content_relevance FLOAT,
  content_quality FLOAT,
  content_engagement FLOAT,
  content_authenticity FLOAT,
  content_value_add FLOAT,
  call_to_action_effectiveness FLOAT,
  trend_alignment_score FLOAT,
  marketing_insights JSONB,
  UNIQUE(tweet_id),
  FOREIGN KEY (tweet_id) REFERENCES tweets(tweet_id) ON DELETE CASCADE
);

-- Indexes for tweet_analysis
CREATE INDEX tweet_analysis_tweet_id_idx ON tweet_analysis(tweet_id);
CREATE INDEX tweet_analysis_created_at_idx ON tweet_analysis(created_at);
CREATE INDEX tweet_analysis_type_idx ON tweet_analysis(type);
CREATE INDEX tweet_analysis_format_idx ON tweet_analysis(format);
CREATE INDEX tweet_analysis_sentiment_idx ON tweet_analysis(sentiment); 