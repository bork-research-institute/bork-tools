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
      targetAccounts: 20,
      qualityTweetsPerAccount: 5,
      accountsToProcess: 3,
    },
    engagementThresholds: {
      minLikes: 10,
      minRetweets: 1,
      minReplies: 1,
    },
    parameters: {
      excludeReplies: true,
      excludeRetweets: true,
      filterLevel: 'low', // 'none' | 'low' | 'medium' | 'high'
    },
  },
} as const;

export type TwitterSearchParams = typeof TWITTER_CONFIG.search.parameters;
export type TwitterEngagementThresholds =
  typeof TWITTER_CONFIG.search.engagementThresholds;
