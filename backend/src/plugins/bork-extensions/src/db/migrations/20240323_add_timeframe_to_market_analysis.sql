-- First drop the existing unique constraint and view
DROP VIEW IF EXISTS market_summary;
ALTER TABLE market_analysis DROP CONSTRAINT IF EXISTS market_analysis_unique;
ALTER TABLE market_analysis DROP CONSTRAINT IF EXISTS market_analysis_market_id_key;

-- Add timeframe column
ALTER TABLE market_analysis 
ADD COLUMN IF NOT EXISTS timeframe VARCHAR(10) NOT NULL DEFAULT '60';

-- Drop old indexes and recreate them
DROP INDEX IF EXISTS idx_market_analysis_market_id;
DROP INDEX IF EXISTS market_analysis_market_id_idx;

-- Create new indexes
CREATE INDEX IF NOT EXISTS market_analysis_timeframe_idx ON market_analysis(timeframe);
CREATE INDEX IF NOT EXISTS market_analysis_market_timeframe_idx ON market_analysis(market_id, timeframe);
CREATE INDEX IF NOT EXISTS market_analysis_created_at_idx ON market_analysis(created_at);

-- Recreate the view with timeframe support
CREATE OR REPLACE VIEW market_summary AS
SELECT 
  ma.market_id,
  ma.ticker,
  ma.timeframe,
  ma.created_at,
  (ma.technical_analysis->>'latestCandle')::jsonb->>'close' as last_price,
  (ma.technical_analysis->>'latestCandle')::jsonb->>'volume' as volume,
  (ma.technical_analysis->>'indicators')::jsonb as indicators,
  (ma.order_book->>'spread')::numeric as spread,
  (ma.order_book->>'spreadPercentage')::numeric as spread_percentage,
  ma.liquidity
FROM market_analysis ma
INNER JOIN (
  SELECT market_id, timeframe, MAX(created_at) as max_created_at
  FROM market_analysis
  GROUP BY market_id, timeframe
) latest ON ma.market_id = latest.market_id 
  AND ma.timeframe = latest.timeframe 
  AND ma.created_at = latest.max_created_at; 