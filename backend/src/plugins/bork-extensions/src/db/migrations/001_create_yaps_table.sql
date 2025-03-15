-- First ensure user_id in target_accounts is unique
ALTER TABLE target_accounts
ADD CONSTRAINT target_accounts_user_id_key UNIQUE (user_id);

-- Create the yaps table
CREATE TABLE IF NOT EXISTS yaps (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  yaps_all DECIMAL NOT NULL,
  yaps_l24h DECIMAL NOT NULL,
  yaps_l48h DECIMAL NOT NULL,
  yaps_l7d DECIMAL NOT NULL,
  yaps_l30d DECIMAL NOT NULL,
  yaps_l3m DECIMAL NOT NULL,
  yaps_l6m DECIMAL NOT NULL,
  yaps_l12m DECIMAL NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(username)
);

-- Add index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_yaps_user_id ON yaps(user_id);

-- Add index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_yaps_username ON yaps(username);

-- Add foreign key constraint to target_accounts table using username
ALTER TABLE yaps
ADD CONSTRAINT fk_yaps_target_accounts
FOREIGN KEY (username)
REFERENCES target_accounts(username)
ON DELETE CASCADE; 