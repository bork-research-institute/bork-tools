-- Add influence metrics columns to target_accounts table
ALTER TABLE target_accounts
ADD COLUMN avg_likes_50 FLOAT DEFAULT 0,
ADD COLUMN avg_retweets_50 FLOAT DEFAULT 0,
ADD COLUMN avg_replies_50 FLOAT DEFAULT 0,
ADD COLUMN avg_views_50 FLOAT DEFAULT 0,
ADD COLUMN engagement_rate_50 FLOAT DEFAULT 0,
ADD COLUMN influence_score FLOAT DEFAULT 0,
ADD COLUMN last_50_tweets_updated_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for the new columns
CREATE INDEX idx_target_accounts_influence_score ON target_accounts(influence_score);
CREATE INDEX idx_target_accounts_engagement_rate ON target_accounts(engagement_rate_50);

-- Add comment explaining the metrics
COMMENT ON COLUMN target_accounts.avg_likes_50 IS 'Average likes for last 50 tweets';
COMMENT ON COLUMN target_accounts.avg_retweets_50 IS 'Average retweets for last 50 tweets';
COMMENT ON COLUMN target_accounts.avg_replies_50 IS 'Average replies for last 50 tweets';
COMMENT ON COLUMN target_accounts.avg_views_50 IS 'Average views for last 50 tweets';
COMMENT ON COLUMN target_accounts.engagement_rate_50 IS 'Engagement rate based on last 50 tweets (likes + retweets + replies / followers)';
COMMENT ON COLUMN target_accounts.influence_score IS 'Composite score of engagement rate, follower count, and other metrics';
COMMENT ON COLUMN target_accounts.last_50_tweets_updated_at IS 'Last time the 50-tweet metrics were updated';

-- Create function to calculate influence score
CREATE OR REPLACE FUNCTION calculate_influence_score(
    p_engagement_rate FLOAT,
    p_followers_count INTEGER,
    p_listed_count INTEGER,
    p_avg_likes FLOAT,
    p_avg_retweets FLOAT
) RETURNS FLOAT AS $$
DECLARE
    normalized_engagement FLOAT;
    normalized_followers FLOAT;
    normalized_listed FLOAT;
    normalized_likes FLOAT;
    normalized_retweets FLOAT;
BEGIN
    -- Normalize values between 0 and 1 using logarithmic scaling
    normalized_engagement := LEAST(1.0, GREATEST(0.0, LN(p_engagement_rate + 1) / LN(101)));
    normalized_followers := LEAST(1.0, GREATEST(0.0, LN(p_followers_count + 1) / LN(1000001)));
    normalized_listed := LEAST(1.0, GREATEST(0.0, LN(p_listed_count + 1) / LN(1001)));
    normalized_likes := LEAST(1.0, GREATEST(0.0, LN(p_avg_likes + 1) / LN(10001)));
    normalized_retweets := LEAST(1.0, GREATEST(0.0, LN(p_avg_retweets + 1) / LN(1001)));

    -- Calculate weighted influence score
    RETURN (
        normalized_engagement * 0.35 +
        normalized_followers * 0.25 +
        normalized_listed * 0.15 +
        normalized_likes * 0.15 +
        normalized_retweets * 0.10
    ) * 100;
END;
$$ LANGUAGE plpgsql;

-- Create function to update engagement metrics
CREATE OR REPLACE FUNCTION update_account_engagement_metrics(p_username VARCHAR) RETURNS void AS $$
DECLARE
    v_followers_count INTEGER;
    v_engagement_rate FLOAT;
    v_influence_score FLOAT;
BEGIN
    -- Get the account's followers count
    SELECT followers_count INTO v_followers_count
    FROM target_accounts
    WHERE username = p_username;

    -- Calculate engagement rate if we have followers
    IF v_followers_count > 0 THEN
        UPDATE target_accounts
        SET engagement_rate_50 = (avg_likes_50 + avg_retweets_50 + avg_replies_50) / NULLIF(followers_count, 0) * 100
        WHERE username = p_username;
    END IF;

    -- Calculate influence score
    SELECT calculate_influence_score(
        engagement_rate_50,
        followers_count,
        listed_count,
        avg_likes_50,
        avg_retweets_50
    ) INTO v_influence_score
    FROM target_accounts
    WHERE username = p_username;

    -- Update influence score
    UPDATE target_accounts
    SET influence_score = v_influence_score
    WHERE username = p_username;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update metrics when averages are updated
CREATE OR REPLACE FUNCTION trigger_update_engagement_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.avg_likes_50 != OLD.avg_likes_50 OR
       NEW.avg_retweets_50 != OLD.avg_retweets_50 OR
       NEW.avg_replies_50 != OLD.avg_replies_50 OR
       NEW.followers_count != OLD.followers_count THEN
        PERFORM update_account_engagement_metrics(NEW.username);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_engagement_metrics
    AFTER UPDATE OF avg_likes_50, avg_retweets_50, avg_replies_50, followers_count
    ON target_accounts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_engagement_metrics(); 