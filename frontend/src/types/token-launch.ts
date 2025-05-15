export interface TokenLaunch {
  id: string;
  createdAt: Date;
  userId: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDescription: string;
  tokenImage: string;
  mintAddress: string;
  transactionId: string;
  campaignUrl: string;
  status: 'pending' | 'success' | 'failed';
  error?: string;
  metadata?: {
    website?: string;
    twitter?: string;
    discord?: string;
    telegram?: string;
  };
}
