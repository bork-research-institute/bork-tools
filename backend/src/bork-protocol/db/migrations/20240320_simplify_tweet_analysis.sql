-- First drop existing table and recreate with new structure
DROP TABLE IF EXISTS tweet_analysis;

CREATE TABLE tweet_analysis (
    id UUID PRIMARY KEY,
    tweet_id TEXT NOT NULL,
    type TEXT NOT NULL,
    format TEXT NOT NULL,
    sentiment TEXT NOT NULL,
    confidence FLOAT NOT NULL,
    content_summary TEXT NOT NULL,
    topics TEXT[] NOT NULL DEFAULT '{}',
    entities TEXT[] NOT NULL DEFAULT '{}',
    -- Quality metrics
    relevance FLOAT NOT NULL,
    originality FLOAT NOT NULL,
    clarity FLOAT NOT NULL,
    authenticity FLOAT NOT NULL,
    value_add FLOAT NOT NULL,
    -- Engagement metrics
    likes INTEGER NOT NULL DEFAULT 0,
    replies INTEGER NOT NULL DEFAULT 0,
    retweets INTEGER NOT NULL DEFAULT 0,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Author info
    author_username TEXT NOT NULL,
    -- Marketing
    marketing_summary TEXT NOT NULL,
    -- Spam detection
    is_spam BOOLEAN NOT NULL DEFAULT FALSE,
    spam_score FLOAT NOT NULL DEFAULT 0
);

-- Create indexes for improved query performance
CREATE INDEX idx_tweet_analysis_tweet_id ON tweet_analysis(tweet_id);
CREATE INDEX idx_tweet_analysis_created_at ON tweet_analysis(created_at);
CREATE INDEX idx_tweet_analysis_author ON tweet_analysis(author_username);
CREATE INDEX idx_tweet_analysis_topics ON tweet_analysis USING gin(topics);
CREATE INDEX idx_tweet_analysis_entities ON tweet_analysis USING gin(entities);
CREATE INDEX idx_tweet_analysis_type ON tweet_analysis(type);
CREATE INDEX idx_tweet_analysis_sentiment ON tweet_analysis(sentiment);

-- Add comment to document the schema
COMMENT ON TABLE tweet_analysis IS 'Stores tweet analysis with simplified schema focused on content quality and engagement metrics';

-- Column comments
COMMENT ON COLUMN tweet_analysis.content_summary IS 'Summary of the tweet content and key points';
COMMENT ON COLUMN tweet_analysis.topics IS 'Array of topics discussed in the tweet';
COMMENT ON COLUMN tweet_analysis.entities IS 'Array of entities (people, organizations, products, etc.) mentioned';
COMMENT ON COLUMN tweet_analysis.relevance IS 'Score 0-1: How relevant the content is to the topics';
COMMENT ON COLUMN tweet_analysis.originality IS 'Score 0-1: How original/unique the content is';
COMMENT ON COLUMN tweet_analysis.clarity IS 'Score 0-1: How clear and well-written the content is';
COMMENT ON COLUMN tweet_analysis.authenticity IS 'Score 0-1: How authentic/genuine the content appears';
COMMENT ON COLUMN tweet_analysis.value_add IS 'Score 0-1: How much value the content adds to readers';
COMMENT ON COLUMN tweet_analysis.marketing_summary IS 'Analysis of marketing effectiveness with actionable recommendations'; 