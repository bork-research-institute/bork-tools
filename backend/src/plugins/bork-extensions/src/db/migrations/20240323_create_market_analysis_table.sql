-- Create market_analysis table
CREATE TABLE IF NOT EXISTS market_analysis (
  id SERIAL PRIMARY KEY,
  market_id VARCHAR(255) NOT NULL,
  ticker VARCHAR(255) NOT NULL,
  technical_analysis JSONB,
  order_book JSONB,
  liquidity JSONB,
  timeframe VARCHAR(10) NOT NULL, -- Store the timeframe (e.g., '1', '5', '15', '60', '1440')
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS market_analysis_market_id_idx ON market_analysis(market_id);
CREATE INDEX IF NOT EXISTS market_analysis_timeframe_idx ON market_analysis(timeframe);
CREATE INDEX IF NOT EXISTS market_analysis_created_at_idx ON market_analysis(created_at);
CREATE INDEX IF NOT EXISTS market_analysis_market_timeframe_idx ON market_analysis(market_id, timeframe);

-- Create a view for market summary that shows the latest data for each market and timeframe
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

-- Add a function to clean up old data (keep last 30 days by default)
CREATE OR REPLACE FUNCTION cleanup_market_analysis(days_to_keep INTEGER DEFAULT 30)
RETURNS void AS $$
BEGIN
  DELETE FROM market_analysis
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE market_analysis IS 'Stores historical market analysis data including technical indicators, order book analysis, and liquidity data';
COMMENT ON VIEW market_summary IS 'Provides the latest market analysis summary for each market and timeframe';
COMMENT ON FUNCTION cleanup_market_analysis IS 'Removes data older than the specified number of days from market_analysis table'; 