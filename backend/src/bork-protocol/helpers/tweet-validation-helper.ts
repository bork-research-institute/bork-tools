import { elizaLogger } from '@elizaos/core';
import type { Tweet } from '../types/twitter';

/**
 * Validates tweets and filters out those with missing IDs
 */
export function validateTweets(tweets: Tweet[]): Tweet[] {
  const validTweets = tweets.filter((tweet) => {
    // Check if we have either tweet_id or id
    const tweetId = tweet.tweet_id || tweet.id;

    if (!tweetId) {
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

    // If tweet has id but not tweet_id, copy id to tweet_id
    if (!tweet.tweet_id && tweet.id) {
      tweet.tweet_id = tweet.id;
      elizaLogger.debug('[Tweet Processing] Copied id to tweet_id field', {
        tweet_id: tweet.tweet_id,
        username: tweet.username,
      });
    }

    return true;
  });

  if (validTweets.length === 0) {
    elizaLogger.error('[Tweet Processing] No valid tweets to process');
  }

  return validTweets;
}
