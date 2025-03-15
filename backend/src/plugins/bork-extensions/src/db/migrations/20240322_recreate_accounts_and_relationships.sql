-- Drop existing tables if they exist
DROP TABLE IF EXISTS user_mentions_relationship;
DROP TABLE IF EXISTS target_accounts;

-- Create target_accounts table
CREATE TABLE target_accounts (
  username VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  description TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  friends_count INTEGER DEFAULT 0,
  media_count INTEGER DEFAULT 0,
  statuses_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  listed_count INTEGER DEFAULT 0,
  tweets_count INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  is_blue_verified BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE,
  location VARCHAR(255),
  avatar_url TEXT,
  banner_url TEXT,
  website_url TEXT,
  can_dm BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  source VARCHAR(50) DEFAULT 'config'
);

-- Create indexes for target_accounts
CREATE INDEX idx_target_accounts_user_id ON target_accounts(user_id);
CREATE INDEX idx_target_accounts_is_active ON target_accounts(is_active);

-- Create user_mentions_relationship table
CREATE TABLE user_mentions_relationship (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_username VARCHAR(255) NOT NULL,
  target_username VARCHAR(255) NOT NULL,
  mention_count INTEGER NOT NULL DEFAULT 1,
  first_mention_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_mention_at TIMESTAMP WITH TIME ZONE NOT NULL,
  tweet_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  relationship_strength DOUBLE PRECISION NOT NULL DEFAULT 0.1,
  is_mutual BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_source_username 
    FOREIGN KEY (source_username) 
    REFERENCES target_accounts(username) 
    ON DELETE CASCADE,
  CONSTRAINT fk_target_username 
    FOREIGN KEY (target_username) 
    REFERENCES target_accounts(username) 
    ON DELETE CASCADE,
  
  -- Ensure no duplicate relationships
  CONSTRAINT unique_relationship 
    UNIQUE(source_username, target_username)
);

-- Create indexes for user_mentions_relationship
CREATE INDEX idx_mentions_source ON user_mentions_relationship(source_username);
CREATE INDEX idx_mentions_target ON user_mentions_relationship(target_username);
CREATE INDEX idx_mentions_strength ON user_mentions_relationship(relationship_strength);
CREATE INDEX idx_mentions_mutual ON user_mentions_relationship(is_mutual);
CREATE INDEX idx_mentions_last_mention ON user_mentions_relationship(last_mention_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mentions_relationship_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mentions_relationship_timestamp
  BEFORE UPDATE ON user_mentions_relationship
  FOR EACH ROW
  EXECUTE FUNCTION update_mentions_relationship_timestamp();

-- Add table comments
COMMENT ON TABLE target_accounts IS 'Stores information about Twitter accounts being monitored';
COMMENT ON TABLE user_mentions_relationship IS 'Tracks mention-based relationships between target accounts';

-- Add column comments for target_accounts
COMMENT ON COLUMN target_accounts.username IS 'Twitter username (without @)';
COMMENT ON COLUMN target_accounts.user_id IS 'Twitter user ID';
COMMENT ON COLUMN target_accounts.source IS 'How this account was added (config, mention, tweet_author)';

-- Add column comments for user_mentions_relationship
COMMENT ON COLUMN user_mentions_relationship.source_username IS 'Username of the account that made the mention';
COMMENT ON COLUMN user_mentions_relationship.target_username IS 'Username of the account that was mentioned';
COMMENT ON COLUMN user_mentions_relationship.relationship_strength IS 'Calculated strength based on frequency and recency (0.1-1.0)';
COMMENT ON COLUMN user_mentions_relationship.is_mutual IS 'Whether both accounts have mentioned each other'; 