-- Add new columns to tweet_analysis table
ALTER TABLE tweet_analysis
  -- Add format column
  ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'statement',

  -- Add account trust signals column
  ADD COLUMN IF NOT EXISTS account_trust_signals FLOAT DEFAULT 0.0,

  -- Add call to action and trend alignment columns
  ADD COLUMN IF NOT EXISTS call_to_action_effectiveness FLOAT DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS trend_alignment_score FLOAT DEFAULT 0.0,

  -- Add marketing insights column
  ADD COLUMN IF NOT EXISTS marketing_insights JSONB;

-- Create new index for format column
CREATE INDEX IF NOT EXISTS tweet_analysis_format_idx ON tweet_analysis(format);

-- Add comment to explain the changes
COMMENT ON TABLE tweet_analysis IS 'Stores detailed analysis of tweets including content format, marketing insights, and enhanced metrics';

-- Add comments on new columns
COMMENT ON COLUMN tweet_analysis.format IS 'The format of the tweet content (e.g., statement, question, poll, thread, etc.)';
COMMENT ON COLUMN tweet_analysis.account_trust_signals IS 'Trust score for the account based on various signals (0-1)';
COMMENT ON COLUMN tweet_analysis.call_to_action_effectiveness IS 'Effectiveness score of the call to action if present (0-1)';
COMMENT ON COLUMN tweet_analysis.trend_alignment_score IS 'How well the content aligns with current trends (0-1)';
COMMENT ON COLUMN tweet_analysis.marketing_insights IS 'Detailed marketing analysis including audience, strategies, and recommendations'; 