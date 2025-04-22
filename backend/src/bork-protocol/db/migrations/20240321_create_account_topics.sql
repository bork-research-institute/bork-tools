CREATE TABLE IF NOT EXISTS account_topics (
  username VARCHAR(255) NOT NULL,
  topic VARCHAR(255) NOT NULL,
  mention_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (username, topic)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_account_topics_username ON account_topics(username);
CREATE INDEX IF NOT EXISTS idx_account_topics_topic ON account_topics(topic);
CREATE INDEX IF NOT EXISTS idx_account_topics_mention_count ON account_topics(mention_count DESC);

-- Add foreign key constraint to ensure username exists in target_accounts
ALTER TABLE account_topics
  ADD CONSTRAINT fk_account_topics_username
  FOREIGN KEY (username)
  REFERENCES target_accounts(username)
  ON DELETE CASCADE; 