import { elizaLogger } from '@elizaos/core';
import type { DatabaseTweet, Tweet } from '../types/twitter';

/**
 * Merges tweet content with its thread and creates a DatabaseTweet object
 * @param tweets Array of tweets to process and merge with their threads
 * @returns Array of DatabaseTweet objects with merged content
 */
export function mergeTweetContent(tweets: Tweet[]): DatabaseTweet[] {
  return tweets.map((tweet) => {
    // Validate tweet has required fields
    if (!tweet.tweet_id && !tweet.id) {
      elizaLogger.error('[Tweet Processing] Tweet missing ID:', {
        userId: tweet.userId,
        username: tweet.username,
        text: tweet.text?.substring(0, 100),
      });
      throw new Error('Tweet missing required ID field');
    }

    // Start with the original tweet text
    let mergedText = tweet.text || '';

    // First merge thread content if it exists
    if (tweet.thread && tweet.thread.length > 0) {
      // Sort thread by timestamp to ensure chronological order
      const sortedThread = tweet.thread.sort(
        (a, b) => (a.timestamp || 0) - (b.timestamp || 0),
      );

      // Merge text from all thread tweets
      for (const threadTweet of sortedThread) {
        // Compare using tweet_id if available, otherwise use id
        const tweetId = tweet.tweet_id;
        const threadTweetId = threadTweet.id.toString();
        if (threadTweetId !== tweetId) {
          mergedText = `${mergedText}\n\n${threadTweet.text || ''}`;
        }
      }
    }

    // Create a new tweet object with merged content
    const processedTweet: DatabaseTweet = {
      ...tweet,
      tweet_id: tweet.tweet_id || '',
      text: mergedText,
      originalText: tweet.text || '',
      isThreadMerged: (tweet.thread?.length || 0) > 0,
      threadSize: tweet.thread?.length || 0,
      // Set default values for required DatabaseTweet fields
      status: 'pending',
      createdAt: new Date(),
      // Keep the original Twitter user ID as a string
      userId: tweet.userId?.toString() || '',
      username: tweet.username || '',
      name: tweet.name || '',
      homeTimeline: {
        publicMetrics: {
          likes: tweet.likes || 0,
          retweets: tweet.retweets || 0,
          replies: tweet.replies || 0,
        },
        entities: {
          hashtags: Array.isArray(tweet.hashtags) ? tweet.hashtags : [],
          mentions: Array.isArray(tweet.mentions)
            ? tweet.mentions.map((mention) => ({
                username: mention.username || '',
                id: mention.id || '',
              }))
            : [],
          urls: Array.isArray(tweet.urls) ? tweet.urls : [],
        },
      },
    };

    return processedTweet;
  });
}
