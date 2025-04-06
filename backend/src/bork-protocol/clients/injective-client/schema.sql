-- Market Analysis Table
CREATE TABLE IF NOT EXISTS market_analysis (
    id SERIAL PRIMARY KEY,
    market_id VARCHAR(255) NOT NULL,
    ticker VARCHAR(50) NOT NULL,
    technical_analysis JSONB NOT NULL,
    order_book JSONB NOT NULL,
    liquidity JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(market_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_market_analysis_market_id ON market_analysis(market_id);
CREATE INDEX IF NOT EXISTS idx_market_analysis_created_at ON market_analysis(created_at);

-- Create function for data retention cleanup
CREATE OR REPLACE FUNCTION cleanup_old_data(retention_days INTEGER)
RETURNS void AS $$
BEGIN
    -- Delete old market analysis data
    DELETE FROM market_analysis 
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Create a view for market summary
CREATE OR REPLACE VIEW market_summary AS
SELECT 
    ma.market_id,
    ma.ticker,
    ma.created_at,
    (ma.technical_analysis->>'latestCandle')::jsonb->>'close' as last_price,
    (ma.technical_analysis->>'indicators')::jsonb as indicators,
    (ma.order_book->>'spread')::numeric as spread,
    (ma.order_book->>'spreadPercentage')::numeric as spread_percentage,
    ma.liquidity
FROM market_analysis ma
WHERE ma.created_at = (
    SELECT MAX(created_at) 
    FROM market_analysis 
    WHERE market_id = ma.market_id
);

-- Comments
COMMENT ON TABLE market_analysis IS 'Stores market analysis data including technical indicators, order book analysis, and liquidity data';
COMMENT ON VIEW market_summary IS 'Provides the latest market analysis summary for each market';
COMMENT ON FUNCTION cleanup_old_data IS 'Removes data older than the specified number of days from market_analysis table'; 