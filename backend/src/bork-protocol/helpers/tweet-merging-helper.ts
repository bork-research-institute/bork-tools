import { tweetQueries } from '@/extensions/src/db/queries';
import { elizaLogger } from '@elizaos/core';
import type { IAgentRuntime } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import type { TwitterService } from '../services/twitter-service';
import type { DatabaseTweet, MergedTweet } from '../types/twitter';

/**
 * Recursively fetches and stores all related tweets in a chain
 * @param twitterService Twitter service instance for making API calls
 * @param tweetId ID of the tweet to fetch related tweets for
 * @param runtime IAgentRuntime instance for accessing agent ID
 * @param processedIds Set of already processed tweet IDs to avoid duplicates
 * @param client Optional database client for transactions
 * @returns Array of fetched tweets in chronological order
 */
async function fetchRelatedTweets(
  twitterService: TwitterService,
  tweetId: string,
  runtime: IAgentRuntime,
  processedIds: Set<string> = new Set(),
  client = null,
): Promise<MergedTweet[]> {
  // If we've already processed this tweet, skip it
  if (processedIds.has(tweetId)) {
    return [];
  }

  try {
    // First check if we already have this tweet in our database
    const existingTweet = await tweetQueries.findTweetByTweetId(
      tweetId,
      client,
    );
    if (existingTweet) {
      processedIds.add(tweetId);
      // Stop recursion here - don't fetch related tweets for existing tweets
      return [existingTweet];
    }

    // Fetch the tweet from Twitter
    const tweet = await twitterService.getTweet(tweetId);
    if (!tweet) {
      return [];
    }

    // First save the newly fetched tweet to the database
    const dbTweet: DatabaseTweet = {
      id: uuidv4(),
      tweet_id: tweet.id,
      agentId: runtime.agentId,
      text: tweet.text || '',
      userId: tweet.userId?.toString() || '',
      username: tweet.username || '',
      name: tweet.name || '',
      timestamp: tweet.timestamp || Math.floor(Date.now() / 1000),
      timeParsed: new Date(),
      likes: tweet.likes || 0,
      retweets: tweet.retweets || 0,
      replies: tweet.replies || 0,
      views: tweet.views || 0,
      bookmarkCount: tweet.bookmarkCount || 0,
      conversationId: tweet.conversationId || '',
      permanentUrl: tweet.permanentUrl || '',
      html: tweet.html || '',
      inReplyToStatus: null, // Don't store full tweet objects to avoid cycles
      inReplyToStatusId: tweet.inReplyToStatusId,
      quotedStatus: null, // Don't store full tweet objects to avoid cycles
      quotedStatusId: tweet.quotedStatusId,
      retweetedStatus: null, // Don't store full tweet objects to avoid cycles
      retweetedStatusId: tweet.retweetedStatusId,
      thread: [], // Will be updated after merging
      isQuoted: tweet.isQuoted || false,
      isPin: tweet.isPin || false,
      isReply: tweet.isReply || false,
      isRetweet: tweet.isRetweet || false,
      isSelfThread: tweet.isSelfThread || false,
      sensitiveContent: tweet.sensitiveContent || false,
      status: 'pending',
      createdAt: new Date(),
      isThreadMerged: false,
      threadSize: 1,
      originalText: tweet.text || '',
      hashtags: Array.isArray(tweet.hashtags) ? tweet.hashtags : [],
      mentions: Array.isArray(tweet.mentions)
        ? tweet.mentions.map((mention) => ({
            username: mention.username || '',
            id: mention.id || '',
          }))
        : [],
      photos: Array.isArray(tweet.photos) ? tweet.photos : [],
      urls: Array.isArray(tweet.urls) ? tweet.urls : [],
      videos: Array.isArray(tweet.videos) ? tweet.videos : [],
      place: tweet.place,
      poll: tweet.poll,
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
    await tweetQueries.saveTweetObject(dbTweet, client);

    // Mark this tweet as processed
    processedIds.add(tweetId);

    // Initialize array to store all related tweets
    const relatedTweets: MergedTweet[] = [];

    // Convert tweet to MergedTweet type
    const mergedTweet: MergedTweet = {
      ...tweet,
      id: uuidv4(), // Internal UUID
      tweet_id: tweet.id, // Twitter's numeric ID
      originalText: tweet.text || '',
      isThreadMerged: false,
      threadSize: 1,
      thread: [], // Don't include full tweet objects in thread to avoid cycles
      hashtags: Array.isArray(tweet.hashtags) ? tweet.hashtags : [],
      mentions: Array.isArray(tweet.mentions) ? tweet.mentions : [],
      photos: Array.isArray(tweet.photos) ? tweet.photos : [],
      urls: Array.isArray(tweet.urls) ? tweet.urls : [],
      videos: Array.isArray(tweet.videos) ? tweet.videos : [],
    };

    // Add the current tweet to the relatedTweets array
    relatedTweets.push(mergedTweet);

    // Handle all the thread relationship types (recursively)
    if (tweet.inReplyToStatusId) {
      try {
        const replyChain = await fetchRelatedTweets(
          twitterService,
          tweet.inReplyToStatusId,
          runtime,
          processedIds,
          client,
        );
        relatedTweets.push(...replyChain);
      } catch (replyError) {
        elizaLogger.warn(
          '[Tweet Fetching] Error fetching reply to status:',
          replyError,
        );
      }
    }

    if (tweet.quotedStatusId) {
      try {
        const quotedTweets = await fetchRelatedTweets(
          twitterService,
          tweet.quotedStatusId,
          runtime,
          processedIds,
          client,
        );
        relatedTweets.push(...quotedTweets);
      } catch (quotedError) {
        elizaLogger.warn(
          '[Tweet Fetching] Error fetching quoted status:',
          quotedError,
        );
      }
    }

    if (tweet.retweetedStatusId) {
      try {
        const retweetedTweets = await fetchRelatedTweets(
          twitterService,
          tweet.retweetedStatusId,
          runtime,
          processedIds,
          client,
        );
        relatedTweets.push(...retweetedTweets);
      } catch (retweetedError) {
        elizaLogger.warn(
          '[Tweet Fetching] Error fetching retweeted status:',
          retweetedError,
        );
      }
    }

    return relatedTweets;
  } catch (error) {
    elizaLogger.error('[Tweet Fetching] Error fetching related tweets:', {
      error: error instanceof Error ? error.message : String(error),
      tweetId,
    });
    return [];
  }
}

/**
 * Merges tweet content with its thread and related tweets
 * @param twitterService Twitter service instance for making API calls
 * @param tweets Array of tweets to process and merge with their threads
 * @returns Array of processed tweets with merged content
 */
export async function mergeTweetContent(
  twitterService: TwitterService,
  runtime: IAgentRuntime,
  tweets: MergedTweet[],
): Promise<DatabaseTweet[]> {
  // Use a transaction for the entire operation
  return tweetQueries.processTweetsInTransaction(async (client) => {
    const processedTweets: DatabaseTweet[] = [];
    const processedIds = new Set<string>();

    for (const tweet of tweets) {
      try {
        // Validate tweet has required fields
        if (!tweet.tweet_id) {
          elizaLogger.error('[Tweet Processing] Tweet missing Twitter ID:', {
            userId: tweet.userId,
            username: tweet.username,
            text: tweet.text?.substring(0, 100),
          });
          continue;
        }

        // Skip if we've already processed this tweet
        if (processedIds.has(tweet.tweet_id)) {
          continue;
        }

        // First save the original tweet to the database
        const dbTweet: DatabaseTweet = {
          id: uuidv4(),
          tweet_id: tweet.tweet_id,
          agentId: runtime.agentId,
          text: tweet.text || '',
          userId: tweet.userId?.toString() || '',
          username: tweet.username || '',
          name: tweet.name || '',
          timestamp: tweet.timestamp || Math.floor(Date.now() / 1000),
          timeParsed: new Date(),
          likes: tweet.likes || 0,
          retweets: tweet.retweets || 0,
          replies: tweet.replies || 0,
          views: tweet.views || 0,
          bookmarkCount: tweet.bookmarkCount || 0,
          conversationId: tweet.conversationId || '',
          permanentUrl: tweet.permanentUrl || '',
          html: tweet.html || '',
          inReplyToStatus: null, // Don't store full tweet objects to avoid cycles
          inReplyToStatusId: tweet.inReplyToStatusId,
          quotedStatus: null, // Don't store full tweet objects to avoid cycles
          quotedStatusId: tweet.quotedStatusId,
          retweetedStatus: null, // Don't store full tweet objects to avoid cycles
          retweetedStatusId: tweet.retweetedStatusId,
          thread: [], // Will be updated after merging
          isQuoted: tweet.isQuoted || false,
          isPin: tweet.isPin || false,
          isReply: tweet.isReply || false,
          isRetweet: tweet.isRetweet || false,
          isSelfThread: tweet.isSelfThread || false,
          sensitiveContent: tweet.sensitiveContent || false,
          status: 'pending',
          createdAt: new Date(),
          isThreadMerged: false,
          threadSize: 1,
          originalText: tweet.text || '',
          mediaType: tweet.mediaType || 'text',
          mediaUrl: tweet.mediaUrl || '',
          hashtags: Array.isArray(tweet.hashtags) ? tweet.hashtags : [],
          mentions: Array.isArray(tweet.mentions)
            ? tweet.mentions.map((mention) => ({
                username: mention.username || '',
                id: mention.id || '',
              }))
            : [],
          photos: Array.isArray(tweet.photos) ? tweet.photos : [],
          urls: Array.isArray(tweet.urls) ? tweet.urls : [],
          videos: Array.isArray(tweet.videos) ? tweet.videos : [],
          place: tweet.place,
          poll: tweet.poll,
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
        await tweetQueries.saveTweetObject(dbTweet, client);
        elizaLogger.debug(
          '[Tweet Processing] Saved original tweet to database:',
          {
            tweetId: tweet.tweet_id,
            userId: tweet.userId,
            username: tweet.username,
          },
        );

        // Now fetch and process related tweets
        const relatedTweets = await fetchRelatedTweets(
          twitterService,
          tweet.tweet_id,
          runtime,
          processedIds,
          client,
        );

        // Sort tweets chronologically
        const sortedTweets = relatedTweets.sort(
          (a, b) => (a.timestamp || 0) - (b.timestamp || 0),
        );

        // Merge the content
        let mergedText = '';
        for (const relatedTweet of sortedTweets) {
          if (relatedTweet.text) {
            if (mergedText) {
              mergedText += '\n\n';
            }
            mergedText += relatedTweet.text;
          }
        }

        // Update the processed tweet with merged content
        const processedTweet: DatabaseTweet = {
          ...dbTweet,
          text: mergedText || tweet.text || '',
          thread: sortedTweets,
          isThreadMerged: sortedTweets.length > 1,
          threadSize: sortedTweets.length,
        };

        processedTweets.push(processedTweet);
        processedIds.add(tweet.tweet_id);

        elizaLogger.debug(
          '[Tweet Merging] Successfully merged tweet with related content:',
          {
            tweetId: tweet.tweet_id,
            relatedTweetsCount: sortedTweets.length,
            mergedTextLength: mergedText.length,
            originalTextLength: tweet.text?.length || 0,
          },
        );
      } catch (error) {
        elizaLogger.error('[Tweet Merging] Error processing tweet:', {
          error: error instanceof Error ? error.message : String(error),
          tweetId: tweet.tweet_id,
        });
      }
    }

    return processedTweets;
  });
}
