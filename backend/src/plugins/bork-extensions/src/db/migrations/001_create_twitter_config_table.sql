-- Create twitter_configs table
CREATE TABLE IF NOT EXISTS twitter_configs (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    target_accounts TEXT[] NOT NULL DEFAULT '{}',
    max_retries INTEGER NOT NULL DEFAULT 5,
    retry_delay INTEGER NOT NULL DEFAULT 10000,
    search_interval_min INTEGER NOT NULL DEFAULT 15,
    search_interval_max INTEGER NOT NULL DEFAULT 30,
    tweet_limit_target_accounts INTEGER NOT NULL DEFAULT 20,
    tweet_limit_quality_per_account INTEGER NOT NULL DEFAULT 5,
    tweet_limit_accounts_to_process INTEGER NOT NULL DEFAULT 3,
    tweet_limit_search_results INTEGER NOT NULL DEFAULT 20,
    min_likes INTEGER NOT NULL DEFAULT 10,
    min_retweets INTEGER NOT NULL DEFAULT 1,
    min_replies INTEGER NOT NULL DEFAULT 1,
    exclude_replies BOOLEAN NOT NULL DEFAULT true,
    exclude_retweets BOOLEAN NOT NULL DEFAULT true,
    filter_level VARCHAR(10) NOT NULL DEFAULT 'low' CHECK (filter_level IN ('none', 'low', 'medium', 'high')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_twitter_configs_username ON twitter_configs(username);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_twitter_configs_updated_at
    BEFORE UPDATE ON twitter_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default configuration
INSERT INTO twitter_configs (
    username,
    target_accounts,
    max_retries,
    retry_delay,
    search_interval_min,
    search_interval_max,
    tweet_limit_target_accounts,
    tweet_limit_quality_per_account,
    tweet_limit_accounts_to_process,
    tweet_limit_search_results,
    min_likes,
    min_retweets,
    min_replies,
    exclude_replies,
    exclude_retweets,
    filter_level
) VALUES (
    'default',
    ARRAY['elonmusk', 'melondotdev', 'theflamesolana', 'citadelwolff', '0xMert_', 'aeyakovenko'],
    5,
    10000,
    15,
    30,
    20,
    5,
    3,
    20,
    10,
    1,
    1,
    true,
    true,
    'low'
) ON CONFLICT (username) DO NOTHING; 