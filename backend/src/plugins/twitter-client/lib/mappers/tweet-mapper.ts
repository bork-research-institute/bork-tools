import type { Tweet as AgentTweet } from 'agent-twitter-client';
import { v4 as uuidv4 } from 'uuid';
import type { DatabaseTweet } from '../types/twitter';

/**
 * Normalizes a tweet by ensuring all fields have default values
 * Maps from AgentTweet to our DatabaseTweet type
 */
export function mapTweet(tweet: AgentTweet): DatabaseTweet {
  return {
    // Core tweet data from AgentTweet
    id: uuidv4(), // Generate a UUID for our database
    tweet_id: tweet.id || '', // Twitter's ID
    text: tweet.text || '',
    userId: tweet.userId || '',
    name: tweet.name || '',
    username: tweet.username || '',
    timestamp: tweet.timestamp || Math.floor(Date.now() / 1000),
    timeParsed: tweet.timeParsed || new Date(),

    // Tweet metrics
    likes: tweet.likes || 0,
    retweets: tweet.retweets || 0,
    replies: tweet.replies || 0,
    views: tweet.views || 0,
    bookmarkCount: tweet.bookmarkCount || 0,

    // Tweet metadata
    conversationId: tweet.conversationId || '',
    permanentUrl: tweet.permanentUrl || '',
    html: tweet.html || '',
    inReplyToStatus: tweet.inReplyToStatus,
    inReplyToStatusId: tweet.inReplyToStatusId,
    quotedStatus: tweet.quotedStatus,
    quotedStatusId: tweet.quotedStatusId,
    retweetedStatus: tweet.retweetedStatus,
    retweetedStatusId: tweet.retweetedStatusId,
    thread: Array.isArray(tweet.thread) ? tweet.thread.map(mapTweet) : [],

    // Tweet flags
    isQuoted: tweet.isQuoted || false,
    isPin: tweet.isPin || false,
    isReply: tweet.isReply || false,
    isRetweet: tweet.isRetweet || false,
    isSelfThread: tweet.isSelfThread || false,
    sensitiveContent: tweet.sensitiveContent || false,

    // Media and entities
    hashtags: Array.isArray(tweet.hashtags) ? tweet.hashtags : [],
    mentions: Array.isArray(tweet.mentions) ? tweet.mentions : [],
    photos: Array.isArray(tweet.photos) ? tweet.photos : [],
    urls: Array.isArray(tweet.urls) ? tweet.urls : [],
    videos: Array.isArray(tweet.videos) ? tweet.videos : [],
    place: tweet.place,
    poll: tweet.poll,

    // Our additional fields with defaults
    status: 'pending',
    createdAt: new Date(),
    mediaType: 'text',
    isThreadMerged: false,
    threadSize: 0,
    originalText: tweet.text || '',
    homeTimeline: {
      publicMetrics: {
        likes: tweet.likes || 0,
        retweets: tweet.retweets || 0,
        replies: tweet.replies || 0,
      },
      entities: {
        hashtags: Array.isArray(tweet.hashtags) ? tweet.hashtags : [],
        mentions: Array.isArray(tweet.mentions)
          ? tweet.mentions.map((m) => ({
              username: m.username || '',
              id: m.id || '',
            }))
          : [],
        urls: Array.isArray(tweet.urls) ? tweet.urls : [],
      },
    },
  };
}
