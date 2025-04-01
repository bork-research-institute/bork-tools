-- Drop the old topic_weights table
DROP TABLE IF EXISTS topic_weights;

-- Create the new topic_weights table with updated schema
CREATE TABLE topic_weights (
    id UUID PRIMARY KEY,
    topic VARCHAR(255) NOT NULL,
    weight FLOAT NOT NULL,
    impact_score FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    engagement_metrics JSONB NOT NULL,
    sentiment VARCHAR(50) NOT NULL,
    confidence FLOAT NOT NULL,
    tweet_id VARCHAR(255) NOT NULL,
    CONSTRAINT weight_range CHECK (weight >= 0 AND weight <= 1),
    CONSTRAINT impact_score_range CHECK (impact_score >= 0 AND impact_score <= 1),
    CONSTRAINT confidence_range CHECK (confidence >= 0 AND confidence <= 1)
);

-- Create indexes for common query patterns
CREATE INDEX idx_topic_weights_topic ON topic_weights(topic);
CREATE INDEX idx_topic_weights_created_at ON topic_weights(created_at);
CREATE INDEX idx_topic_weights_tweet_id ON topic_weights(tweet_id);

-- Create a composite index for topic trend analysis
CREATE INDEX idx_topic_weights_topic_created_at ON topic_weights(topic, created_at DESC);

-- Add a GiST index for the engagement_metrics JSONB field to improve query performance
CREATE INDEX idx_topic_weights_engagement_metrics ON topic_weights USING GIN (engagement_metrics);

-- Add comments for documentation
COMMENT ON TABLE topic_weights IS 'Stores longitudinal topic weight data with engagement metrics and sentiment analysis';
COMMENT ON COLUMN topic_weights.id IS 'Unique identifier for each topic weight entry';
COMMENT ON COLUMN topic_weights.topic IS 'The topic being weighted';
COMMENT ON COLUMN topic_weights.weight IS 'Calculated weight of the topic (0-1)';
COMMENT ON COLUMN topic_weights.impact_score IS 'Impact score of the topic (0-1)';
COMMENT ON COLUMN topic_weights.created_at IS 'Timestamp when this weight was recorded';
COMMENT ON COLUMN topic_weights.engagement_metrics IS 'JSON containing various engagement metrics';
COMMENT ON COLUMN topic_weights.sentiment IS 'Sentiment analysis result for the topic';
COMMENT ON COLUMN topic_weights.confidence IS 'Confidence score of the analysis (0-1)';
COMMENT ON COLUMN topic_weights.tweet_id IS 'Reference to the tweet where this topic was mentioned';

-- Create a time-bucket function for time-series analysis
CREATE OR REPLACE FUNCTION time_bucket(bucket interval, ts timestamptz)
RETURNS timestamptz AS $$
BEGIN
  RETURN date_trunc('hour', ts);
END;
$$ LANGUAGE plpgsql IMMUTABLE; 