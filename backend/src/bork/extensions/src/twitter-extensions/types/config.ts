export interface TwitterConfig {
  targetAccounts: string[];
  search: {
    maxRetries: number;
    retryDelay: number;
    searchInterval: {
      min: number;
      max: number;
    };
    tweetLimits: {
      targetAccounts: number;
      qualityTweetsPerAccount: number;
      accountsToProcess: number;
      searchResults: number;
    };
    engagementThresholds: {
      minLikes: number;
      minRetweets: number;
      minReplies: number;
    };
    parameters: {
      excludeReplies: boolean;
      excludeRetweets: boolean;
      filterLevel: 'none' | 'low' | 'medium' | 'high';
    };
  };
}

export interface TwitterConfigRow {
  target_accounts: string[];
  max_retries: number;
  retry_delay: number;
  search_interval_min: number;
  search_interval_max: number;
  tweet_limit_target_accounts: number;
  tweet_limit_quality_per_account: number;
  tweet_limit_accounts_to_process: number;
  tweet_limit_search_results: number;
  min_likes: number;
  min_retweets: number;
  min_replies: number;
  exclude_replies: boolean;
  exclude_retweets: boolean;
  filter_level: 'none' | 'low' | 'medium' | 'high';
}
