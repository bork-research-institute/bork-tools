import { elizaLogger } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import type { MergedTweet, Tweet } from '../types/twitter';

/**
 * Validates tweets and filters out those with missing IDs
 */
export function validateTweets(tweets: Tweet[]): Tweet[] {
  const validTweets = tweets.filter((tweet) => {
    if (!tweet.tweet_id) {
      elizaLogger.warn(
        '[Tweet Processing] Skipping tweet with missing Twitter ID:',
        {
          userId: tweet.userId,
          username: tweet.username,
          text: tweet.text?.substring(0, 100),
        },
      );
      return false;
    }
    return true;
  });

  if (validTweets.length === 0) {
    elizaLogger.error('[Tweet Processing] No valid tweets to process');
  }

  return validTweets;
}

/**
 * Prepares tweets for merging by converting them to MergedTweet type
 */
export function prepareTweetsForMerging(tweets: Tweet[]): MergedTweet[] {
  return tweets.map((tweet) => ({
    ...tweet,
    id: tweet.id || uuidv4(), // Internal UUID
    tweet_id: tweet.tweet_id, // Twitter's numeric ID
    originalText: tweet.text || '',
    isThreadMerged: false,
    threadSize: 1,
    thread: [],
    hashtags: Array.isArray(tweet.hashtags) ? tweet.hashtags : [],
    mentions: Array.isArray(tweet.mentions) ? tweet.mentions : [],
    photos: Array.isArray(tweet.photos) ? tweet.photos : [],
    urls: Array.isArray(tweet.urls) ? tweet.urls : [],
    videos: Array.isArray(tweet.videos) ? tweet.videos : [],
  }));
}
