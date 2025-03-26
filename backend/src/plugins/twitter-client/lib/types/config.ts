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
      includeReplies?: boolean;
      includeRetweets?: boolean;
      includeQuotes?: boolean;
      includeThreads?: boolean;
      [key: string]: string | number | boolean | undefined;
    };
    engagementThresholds: {
      minLikes: number;
      minRetweets: number;
      minReplies: number;
    };
  };
}
