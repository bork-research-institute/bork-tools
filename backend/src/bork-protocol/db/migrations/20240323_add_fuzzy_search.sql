-- Enable the pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN indexes for fuzzy search on relevant columns
CREATE INDEX IF NOT EXISTS idx_tweet_analysis_author_username_trgm ON tweet_analysis USING gin(author_username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tweet_analysis_content_summary_trgm ON tweet_analysis USING gin(content_summary gin_trgm_ops);

-- Create GIN index for topics array (using array_ops instead of gin_trgm_ops)
CREATE INDEX IF NOT EXISTS idx_tweet_analysis_topics ON tweet_analysis USING gin(topics array_ops);

-- Create GIN indexes for tweets table
CREATE INDEX IF NOT EXISTS idx_tweets_username_trgm ON tweets USING gin(username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tweets_name_trgm ON tweets USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tweets_text_trgm ON tweets USING gin(text gin_trgm_ops);

-- Create a function to search within arrays using trigram similarity
CREATE OR REPLACE FUNCTION array_similarity(arr text[], search_term text, threshold float DEFAULT 0.3)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM unnest(arr) AS element
    WHERE similarity(element, search_term) > threshold
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE; 