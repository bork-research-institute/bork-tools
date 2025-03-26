-- First add the new id column
ALTER TABLE tweets ADD COLUMN id UUID DEFAULT gen_random_uuid();

-- Make tweet_id NOT NULL and UNIQUE but not primary key
ALTER TABLE tweets ALTER COLUMN tweet_id SET NOT NULL;
ALTER TABLE tweets ADD CONSTRAINT tweets_tweet_id_unique UNIQUE (tweet_id);

-- Make id the primary key
ALTER TABLE tweets DROP CONSTRAINT tweets_pkey;
ALTER TABLE tweets ADD PRIMARY KEY (id);

-- Add index on tweet_id for faster lookups
CREATE INDEX IF NOT EXISTS tweets_tweet_id_idx ON tweets(tweet_id);

-- Update tweet_analysis table to reference the new UUID
ALTER TABLE tweet_analysis ADD COLUMN tweet_uuid UUID;
UPDATE tweet_analysis ta 
SET tweet_uuid = t.id 
FROM tweets t 
WHERE ta.tweet_id = t.tweet_id;

ALTER TABLE tweet_analysis ALTER COLUMN tweet_uuid SET NOT NULL;
ALTER TABLE tweet_analysis DROP CONSTRAINT tweet_analysis_pkey;
ALTER TABLE tweet_analysis ADD PRIMARY KEY (tweet_uuid);
ALTER TABLE tweet_analysis ADD CONSTRAINT tweet_analysis_tweet_fk 
  FOREIGN KEY (tweet_uuid) REFERENCES tweets(id) ON DELETE CASCADE; 