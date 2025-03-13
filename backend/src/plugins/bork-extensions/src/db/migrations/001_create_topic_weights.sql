-- Create topic_weights table
CREATE TABLE IF NOT EXISTS topic_weights (
    topic TEXT PRIMARY KEY,
    weight DOUBLE PRECISION NOT NULL,
    impact_score DOUBLE PRECISION NOT NULL,
    last_updated TIMESTAMP NOT NULL,
    seed_weight DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on weight for faster sorting
CREATE INDEX IF NOT EXISTS idx_topic_weights_weight ON topic_weights(weight DESC);

-- Create index on last_updated for faster updates
CREATE INDEX IF NOT EXISTS idx_topic_weights_last_updated ON topic_weights(last_updated);

-- Add comment to table
COMMENT ON TABLE topic_weights IS 'Stores topic weights for tweet analysis and search term selection';

-- Add comments to columns
COMMENT ON COLUMN topic_weights.topic IS 'The topic identifier';
COMMENT ON COLUMN topic_weights.weight IS 'Current weight of the topic (0-1)';
COMMENT ON COLUMN topic_weights.impact_score IS 'Impact score of the topic (0-1)';
COMMENT ON COLUMN topic_weights.last_updated IS 'Timestamp of last weight update';
COMMENT ON COLUMN topic_weights.seed_weight IS 'Initial seed weight for the topic (0-1)';
COMMENT ON COLUMN topic_weights.created_at IS 'Timestamp when the topic was first added'; 