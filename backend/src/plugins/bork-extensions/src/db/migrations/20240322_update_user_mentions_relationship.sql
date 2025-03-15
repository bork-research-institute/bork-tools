-- First drop existing indexes and constraints
DROP INDEX IF EXISTS idx_user_mentions_source;
DROP INDEX IF EXISTS idx_user_mentions_target;

-- Modify the user_mentions_relationship table to use usernames and add foreign key constraints
ALTER TABLE user_mentions_relationship
  -- Rename columns to clarify they are usernames
  RENAME COLUMN source_user_id TO source_username;
ALTER TABLE user_mentions_relationship
  RENAME COLUMN target_user_id TO target_username;

-- Add foreign key constraints
ALTER TABLE user_mentions_relationship
  ADD CONSTRAINT fk_source_username
  FOREIGN KEY (source_username)
  REFERENCES target_accounts(username)
  ON DELETE CASCADE;

ALTER TABLE user_mentions_relationship
  ADD CONSTRAINT fk_target_username
  FOREIGN KEY (target_username)
  REFERENCES target_accounts(username)
  ON DELETE CASCADE;

-- Recreate indexes with new column names
CREATE INDEX IF NOT EXISTS idx_user_mentions_source ON user_mentions_relationship(source_username);
CREATE INDEX IF NOT EXISTS idx_user_mentions_target ON user_mentions_relationship(target_username);

-- Update the unique constraint
DROP INDEX IF EXISTS user_mentions_relationship_source_user_id_target_user_id_key;
ALTER TABLE user_mentions_relationship
  ADD CONSTRAINT user_mentions_relationship_usernames_unique 
  UNIQUE(source_username, target_username);

-- Add comments
COMMENT ON TABLE user_mentions_relationship IS 'Tracks many-to-many relationships between target accounts based on mentions';
COMMENT ON COLUMN user_mentions_relationship.source_username IS 'Username of the account that made the mention';
COMMENT ON COLUMN user_mentions_relationship.target_username IS 'Username of the account that was mentioned'; 