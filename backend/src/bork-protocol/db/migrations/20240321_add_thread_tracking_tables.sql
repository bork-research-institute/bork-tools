-- Create posted_threads table
CREATE TABLE IF NOT EXISTS posted_threads (
    id UUID PRIMARY KEY,
    agent_id TEXT NOT NULL,
    primary_topic TEXT NOT NULL,
    related_topics TEXT[] NOT NULL DEFAULT '{}',
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
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create used_knowledge table
CREATE TABLE IF NOT EXISTS used_knowledge (
    id UUID PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES posted_threads(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    source JSONB NOT NULL,
    use_count INTEGER NOT NULL DEFAULT 1,
    performance_contribution FLOAT NOT NULL DEFAULT 0,
    first_used TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (content) -- Ensures we don't duplicate the same knowledge
);

-- Create topic_performance table
CREATE TABLE IF NOT EXISTS topic_performance (
    id UUID PRIMARY KEY,
    topic TEXT NOT NULL UNIQUE,
    total_threads INTEGER NOT NULL DEFAULT 0,
    avg_engagement JSONB NOT NULL DEFAULT '{
        "likes": 0,
        "retweets": 0,
        "replies": 0,
        "views": 0
    }',
    last_posted TIMESTAMP WITH TIME ZONE,
    performance_score FLOAT NOT NULL DEFAULT 0,
    best_performing_thread_id UUID REFERENCES posted_threads(id) ON DELETE SET NULL,
    worst_performing_thread_id UUID REFERENCES posted_threads(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_posted_threads_primary_topic ON posted_threads(primary_topic);
CREATE INDEX IF NOT EXISTS idx_posted_threads_created_at ON posted_threads(created_at);
CREATE INDEX IF NOT EXISTS idx_used_knowledge_thread_id ON used_knowledge(thread_id);
CREATE INDEX IF NOT EXISTS idx_used_knowledge_last_used ON used_knowledge(last_used);
CREATE INDEX IF NOT EXISTS idx_topic_performance_performance_score ON topic_performance(performance_score);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_posted_threads_updated_at
    BEFORE UPDATE ON posted_threads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topic_performance_updated_at
    BEFORE UPDATE ON topic_performance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add GIN indexes for faster JSON/array operations
CREATE INDEX IF NOT EXISTS idx_posted_threads_related_topics ON posted_threads USING GIN(related_topics);
CREATE INDEX IF NOT EXISTS idx_posted_threads_engagement ON posted_threads USING GIN(engagement);
CREATE INDEX IF NOT EXISTS idx_topic_performance_avg_engagement ON topic_performance USING GIN(avg_engagement);

-- Add comments for documentation
COMMENT ON TABLE posted_threads IS 'Tracks threads that have been posted, including their topics and performance metrics';
COMMENT ON TABLE used_knowledge IS 'Tracks knowledge pieces that have been used in threads to avoid repetition';
COMMENT ON TABLE topic_performance IS 'Aggregates performance metrics per topic to inform future thread generation';

-- Add comments on columns
COMMENT ON COLUMN posted_threads.performance_score IS 'Calculated score based on engagement metrics and other factors';
COMMENT ON COLUMN used_knowledge.performance_contribution IS 'How much this knowledge piece contributed to thread performance';
COMMENT ON COLUMN topic_performance.performance_score IS 'Overall topic performance score for ranking';

-- Create a view for easy access to thread performance metrics
CREATE OR REPLACE VIEW thread_performance_metrics AS
SELECT 
    pt.id as thread_id,
    pt.primary_topic,
    pt.related_topics,
    pt.engagement,
    pt.performance_score,
    pt.created_at,
    COUNT(uk.id) as knowledge_pieces_used,
    AVG(uk.performance_contribution) as avg_knowledge_contribution
FROM posted_threads pt
LEFT JOIN used_knowledge uk ON uk.thread_id = pt.id
GROUP BY pt.id, pt.primary_topic, pt.related_topics, pt.engagement, pt.performance_score, pt.created_at; 