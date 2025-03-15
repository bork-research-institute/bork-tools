-- Create target_accounts table
CREATE TABLE IF NOT EXISTS target_accounts (
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

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS target_accounts_user_id_idx ON target_accounts(user_id);

-- Create index on is_active for filtering active accounts
CREATE INDEX IF NOT EXISTS target_accounts_is_active_idx ON target_accounts(is_active); 