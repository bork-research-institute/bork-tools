export interface TokenLaunch {
  id: string;
  createdAt: Date;
  userId: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDescription: string;
  tokenImage: string; // base64 encoded image
  mintAddress: string;
  transactionId: string;
  campaignUrl: string;
  status: 'pending' | 'success' | 'failed';
  error?: string;
  metadata: {
    website?: string;
    twitter?: string;
    discord?: string;
    telegram?: string;
  };
}

export interface DatabaseTokenLaunch {
  id: string;
  created_at: Date;
  user_id: string;
  token_name: string;
  token_symbol: string;
  token_description: string;
  token_image: string;
  mint_address: string;
  transaction_id: string;
  campaign_url: string;
  status: 'pending' | 'success' | 'failed';
  error?: string;
  metadata: {
    website?: string;
    twitter?: string;
    discord?: string;
    telegram?: string;
  };
}
