CREATE TABLE IF NOT EXISTS token_launches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id UUID NOT NULL REFERENCES accounts(id),
  token_name VARCHAR(255) NOT NULL,
  token_symbol VARCHAR(10) NOT NULL,
  token_description TEXT NOT NULL,
  token_image TEXT NOT NULL,
  mint_address VARCHAR(44) NOT NULL,
  transaction_id VARCHAR(88) NOT NULL,
  campaign_url TEXT NOT NULL,
  status VARCHAR(10) NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable Row Level Security
ALTER TABLE token_launches ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable full access for postgres role" ON token_launches
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable read access for public" ON token_launches
  FOR SELECT
  TO public
  USING (true);

CREATE INDEX IF NOT EXISTS token_launches_user_id_idx ON token_launches(user_id);
CREATE INDEX IF NOT EXISTS token_launches_mint_address_idx ON token_launches(mint_address);
CREATE INDEX IF NOT EXISTS token_launches_status_idx ON token_launches(status); 