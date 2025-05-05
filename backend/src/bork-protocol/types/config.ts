export interface TwitterConfig {
  targetAccounts: string[];
  search: {
    tweetLimits: {
      accountsToProcess: number;
      targetAccounts: number;
      qualityTweetsPerAccount: number;
    };
    parameters: {
      // Define specific parameters used in Twitter search
      query?: string;
      since?: string;
      until?: string;
      lang?: string;
      maxResults?: number;
      excludeReplies: boolean;
      excludeRetweets: boolean;
      includeQuotes?: boolean;
      includeThreads?: boolean;
      filterLevel?: 'none' | 'low' | 'medium' | 'high';
    };
    engagementThresholds: {
      minLikes: number;
      minRetweets: number;
      minReplies: number;
    };
  };
}
