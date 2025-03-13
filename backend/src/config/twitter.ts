export const TWITTER_CONFIG = {
  targetAccounts: ['borkinstitute', 'CoinDesk'] as const,

  influencerAccounts: ['melondotdev'] as const,

  search: {
    maxRetries: 5,
    retryDelay: 10000,
    searchInterval: {
      min: 60, // minutes
      max: 120, // minutes
    },
    tweetLimits: {
      targetAccounts: 10,
      influencerAccounts: 5,
      searchResults: 20,
    },
  },
} as const;
