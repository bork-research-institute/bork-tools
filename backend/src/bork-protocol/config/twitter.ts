export const TWITTER_CONFIG = {
  targetAccounts: [
    'elonmusk',
    'melondotdev',
    'theflamesolana',
    'citadelwolff',
    '0xMert_',
    'aeyakovenko',
  ] as const,

  search: {
    maxRetries: 5,
    retryDelay: 10000,
    searchInterval: {
      min: 15,
      max: 30,
    },
    tweetLimits: {
      targetAccounts: 20, // Initial number of tweets to fetch per account for filtering
      qualityTweetsPerAccount: 5, // Maximum number of high-quality tweets to keep per account
      accountsToProcess: 3, // Number of random accounts to process in each cycle
      searchResults: 20, // Number of tweets to fetch for search queries
    },
    engagementThresholds: {
      minLikes: 0,
      minRetweets: 0,
      minReplies: 0,
    },
    parameters: {
      excludeReplies: false,
      excludeRetweets: false,
      filterLevel: 'low', // 'none' | 'low' | 'medium' | 'high'
    },
  },
} as const;

export type TwitterSearchParams = typeof TWITTER_CONFIG.search.parameters;
export type TwitterEngagementThresholds =
  typeof TWITTER_CONFIG.search.engagementThresholds;
