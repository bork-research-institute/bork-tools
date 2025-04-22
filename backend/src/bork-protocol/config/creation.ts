/**
 * Time intervals in milliseconds
 */
export const TIME_INTERVALS = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Content creation settings
 */
export const CONTENT_CREATION = {
  // Main cycle intervals
  HYPOTHESIS_REFRESH_INTERVAL: TIME_INTERVALS.DAY, // Generate new hypothesis every 24 hours
  CONTENT_GENERATION_INTERVAL: TIME_INTERVALS.DAY, // Generate content every 24 hours

  // Thread generation settings
  MAX_THREAD_LENGTH: 25, // Maximum number of tweets in a thread
  MIN_THREAD_LENGTH: 3, // Minimum number of tweets in a thread
  OPTIMAL_THREAD_LENGTH: 7, // Optimal number of tweets for engagement

  // Media generation settings
  SHOULD_GENERATE_MEDIA: true, // Whether to generate images/media for tweets
  MAX_MEDIA_PER_THREAD: 4, // Maximum number of media items per thread

  // Scheduling settings
  MIN_TIME_BETWEEN_THREADS: TIME_INTERVALS.HOUR * 4, // Minimum 4 hours between thread posts
  OPTIMAL_POSTING_TIMES: [
    9, // 9 AM
    12, // 12 PM
    15, // 3 PM
    19, // 7 PM
  ],

  // Performance tracking
  PERFORMANCE_CHECK_INTERVALS: [
    TIME_INTERVALS.HOUR, // Check after 1 hour
    TIME_INTERVALS.HOUR * 24, // Check after 24 hours
    TIME_INTERVALS.DAY * 7, // Check after 1 week
  ],

  // Engagement thresholds for success
  ENGAGEMENT_THRESHOLDS: {
    LIKES: {
      LOW: 5,
      MEDIUM: 20,
      HIGH: 100,
    },
    RETWEETS: {
      LOW: 2,
      MEDIUM: 10,
      HIGH: 50,
    },
    REPLIES: {
      LOW: 1,
      MEDIUM: 5,
      HIGH: 25,
    },
    IMPRESSIONS: {
      LOW: 500,
      MEDIUM: 2000,
      HIGH: 10000,
    },
  },
} as const;
