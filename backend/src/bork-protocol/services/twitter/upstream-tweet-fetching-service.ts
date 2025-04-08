import { tweetQueries } from '@/extensions/src/db/queries';
import type { TwitterService } from '@/services/twitter/twitter-service';
import type { Tweet } from '@/types/twitter';
import type { IAgentRuntime } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import type { DatabaseTweet, MergedTweet } from '../../types/twitter';

/**
 * Prepares tweets for merging by converting them to MergedTweet type
 */
export function prepareTweetsForUpstreamFetching(
  tweets: Tweet[],
): MergedTweet[] {
  return tweets.map((tweet) => ({
    ...tweet,
    id: tweet.id || uuidv4(),
    tweet_id: tweet.tweet_id,
    originalText: tweet.text,
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

/**
 * Recursively fetches all parent tweets up the chain by following quoted_status_id,
 * in_reply_to_status_id, or retweeted_status_id until no more parents exist
 */
async function fetchUpstreamTweets(
  tweet: Tweet,
  twitterService: TwitterService,
  processedIds: Set<string> = new Set(),
): Promise<void> {
  if (!tweet || processedIds.has(tweet.id)) {
    return;
  }
  processedIds.add(tweet.id);

  try {
    // Check for any parent tweet ID
    const parentId =
      tweet.inReplyToStatusId ||
      tweet.quotedStatusId ||
      tweet.retweetedStatusId;

    if (parentId) {
      elizaLogger.info('[Tweet Merging] Fetching parent tweet:', {
        parentId,
        childTweetId: tweet.id,
        relationship:
          tweet.inReplyToStatusId === parentId
            ? 'reply'
            : tweet.quotedStatusId === parentId
              ? 'quote'
              : 'retweet',
      });

      const parentTweet = await twitterService.getTweet(parentId);
      if (parentTweet) {
        elizaLogger.info('[Tweet Merging] Successfully fetched parent tweet:', {
          parentId,
          parentText: parentTweet.text?.substring(0, 100),
          childTweetId: tweet.id,
        });

        // Create a clean copy of the parent tweet without any references back to children
        const cleanParentTweet = {
          ...parentTweet,
          inReplyToStatus: null,
          quotedStatus: null,
          retweetedStatus: null,
          thread: [],
        };

        // Set the appropriate relationship
        if (parentId === tweet.inReplyToStatusId) {
          tweet.inReplyToStatus = cleanParentTweet;
        } else if (parentId === tweet.quotedStatusId) {
          tweet.quotedStatus = cleanParentTweet;
        } else if (parentId === tweet.retweetedStatusId) {
          tweet.retweetedStatus = cleanParentTweet;
        }

        // Continue up the chain with the parent tweet
        await fetchUpstreamTweets(parentTweet, twitterService, processedIds);
      } else {
        elizaLogger.warn('[Tweet Merging] Parent tweet not found:', {
          parentId,
          childTweetId: tweet.id,
          relationship:
            tweet.inReplyToStatusId === parentId
              ? 'reply'
              : tweet.quotedStatusId === parentId
                ? 'quote'
                : 'retweet',
        });
      }
    }
  } catch (error) {
    elizaLogger.error('[Tweet Merging] Error fetching parent tweet:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      tweetId: tweet.id,
      parentId:
        tweet.inReplyToStatusId ||
        tweet.quotedStatusId ||
        tweet.retweetedStatusId,
    });
  }
}

/**
 * Processes tweets and establishes their relationship chain by fetching parent tweets
 * @param twitterService Twitter service instance for making API calls
 * @param tweets Array of tweets to process
 * @returns Array of processed tweets with established parent relationships
 */
export async function getUpstreamTweets(
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
          inReplyToStatus: null,
          inReplyToStatusId: tweet.inReplyToStatusId,
          quotedStatus: null,
          quotedStatusId: tweet.quotedStatusId,
          retweetedStatus: null,
          retweetedStatusId: tweet.retweetedStatusId,
          thread: [],
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
        elizaLogger.info(
          '[Tweet Processing] Saved original tweet to database:',
          {
            tweetId: tweet.tweet_id,
            userId: tweet.userId,
            username: tweet.username,
          },
        );

        // Fetch and establish parent tweet relationships
        await fetchUpstreamTweets(tweet, twitterService);

        // Count the number of parent tweets in the chain
        let chainLength = 1;
        let currentTweet: Tweet | undefined = tweet;
        while (currentTweet) {
          if (currentTweet.inReplyToStatus) {
            chainLength++;
            currentTweet = currentTweet.inReplyToStatus;
          } else if (currentTweet.quotedStatus) {
            chainLength++;
            currentTweet = currentTweet.quotedStatus;
          } else if (currentTweet.retweetedStatus) {
            chainLength++;
            currentTweet = currentTweet.retweetedStatus;
          } else {
            currentTweet = undefined;
          }
        }

        // Update the processed tweet with relationship info
        const processedTweet: DatabaseTweet = {
          ...dbTweet,
          inReplyToStatus: tweet.inReplyToStatus,
          quotedStatus: tweet.quotedStatus,
          retweetedStatus: tweet.retweetedStatus,
          isThreadMerged: chainLength > 1,
          threadSize: chainLength,
        };

        processedTweets.push(processedTweet);
        processedIds.add(tweet.tweet_id);

        elizaLogger.info(
          '[Tweet Processing] Successfully established tweet relationships:',
          {
            tweetId: tweet.tweet_id,
            chainLength,
            hasReplyParent: !!tweet.inReplyToStatus,
            hasQuoteParent: !!tweet.quotedStatus,
            hasRetweetParent: !!tweet.retweetedStatus,
          },
        );
      } catch (error) {
        elizaLogger.error('[Tweet Processing] Error processing tweet:', {
          error: error instanceof Error ? error.message : String(error),
          tweetId: tweet.tweet_id,
        });
      }
    }

    return processedTweets;
  });
}
