import { tweetQueries } from '@/extensions/src/db/queries';
import type { TwitterService } from '@/services/twitter/twitter-service';
import type { Tweet } from '@/types/twitter';
import type { IAgentRuntime } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import type { DatabaseTweet, MergedTweet } from '../../types/twitter';

const logger = elizaLogger;

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
      logger.info('[Tweet Merging] Fetching parent tweet:', {
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
        logger.info('[Tweet Merging] Successfully fetched parent tweet:', {
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
        logger.warn('[Tweet Merging] Parent tweet not found:', {
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
    logger.error('[Tweet Merging] Error fetching parent tweet:', {
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
 * Merges tweet content with its parent tweets
 * @param twitterService Twitter service instance for making API calls
 * @param tweets Array of tweets to process and merge with their parents
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

        // Fetch all parent tweets
        await fetchUpstreamTweets(tweet, twitterService);

        // Collect all parent tweets in chronological order
        const parentTweets: Tweet[] = [];
        let currentTweet: Tweet | undefined = tweet;

        while (currentTweet) {
          // Add the current tweet to the list
          parentTweets.push(currentTweet);

          // Find the next parent tweet (prioritize reply -> quote -> retweet)
          if (currentTweet.inReplyToStatus) {
            currentTweet = currentTweet.inReplyToStatus;
          } else if (currentTweet.quotedStatus) {
            currentTweet = currentTweet.quotedStatus;
          } else if (currentTweet.retweetedStatus) {
            currentTweet = currentTweet.retweetedStatus;
          } else {
            currentTweet = undefined;
          }
        }

        // Sort tweets chronologically (oldest first)
        const sortedTweets = parentTweets.reverse();

        // Merge the content with clear attribution
        let mergedText = '';
        for (let i = 0; i < sortedTweets.length; i++) {
          const currentTweet = sortedTweets[i];
          if (!currentTweet.text) {
            continue;
          }

          // Determine the relationship type for all tweets except the first (original)
          let relationship = '';
          if (i > 0) {
            const prevTweet = sortedTweets[i - 1];
            if (currentTweet.inReplyToStatusId === prevTweet.id) {
              relationship = '[REPLY]';
            } else if (currentTweet.quotedStatusId === prevTweet.id) {
              relationship = '[QUOTE TWEET]';
            } else if (currentTweet.retweetedStatusId === prevTweet.id) {
              relationship = '[RETWEET]';
            }
          }

          if (mergedText) {
            mergedText += '>>>';
          }

          // Format: "original post/reply/quote tweet @username: 'text'"
          const prefix = i === 0 ? '[ORIGINAL POST]' : relationship;
          mergedText += `${prefix} @${currentTweet.username}: '${currentTweet.text}'`;
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

        elizaLogger.info(
          '[Tweet Merging] Successfully merged tweet with parent tweets:',
          {
            tweetId: tweet.tweet_id,
            parentTweetsCount: sortedTweets.length - 1,
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
