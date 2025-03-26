-- First rename the id column to tweet_id
ALTER TABLE tweets RENAME COLUMN id TO tweet_id;

-- Change the type of tweet_id to TEXT
ALTER TABLE tweets ALTER COLUMN tweet_id TYPE TEXT USING tweet_id::text;

-- Drop and recreate indexes that might reference the old column
DROP INDEX IF EXISTS tweets_user_id_idx;
DROP INDEX IF EXISTS tweets_status_idx;
DROP INDEX IF EXISTS tweets_created_at_idx;
DROP INDEX IF EXISTS tweets_timestamp_idx;

-- Recreate indexes
CREATE INDEX tweets_user_id_idx ON tweets(user_id);
CREATE INDEX tweets_status_idx ON tweets(status);
CREATE INDEX tweets_created_at_idx ON tweets(created_at);
CREATE INDEX tweets_timestamp_idx ON tweets(timestamp); 