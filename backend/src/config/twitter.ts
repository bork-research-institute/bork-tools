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
