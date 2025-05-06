import type { TwitterService } from '@/services/twitter-service';
import { tweetQueries } from '@bork/db/queries';
import type { Tweet } from '@bork/types/twitter';
import type { TweetWithUpstream } from '@bork/types/twitter';
import type { IAgentRuntime } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import { mapTweet } from '../../mappers/tweet-mapper';
/**
 * Recursively fetches all parent tweets up the chain by following quoted_status_id,
 * in_reply_to_status_id, or retweeted_status_id until no more parents exist
 */
async function fetchUpstreamTweets(
  tweet: Tweet,
  twitterService: TwitterService,
  processedIds: Set<string> = new Set(),
): Promise<{
  inReplyChain: Tweet[];
  quotedTweets: Tweet[];
  retweetedTweets: Tweet[];
}> {
  if (!tweet || processedIds.has(tweet.id)) {
    return {
      inReplyChain: [],
      quotedTweets: [],
      retweetedTweets: [],
    };
  }
  processedIds.add(tweet.id);

  const upstreamTweets = {
    inReplyChain: [] as Tweet[],
    quotedTweets: [] as Tweet[],
    retweetedTweets: [] as Tweet[],
  };

  try {
    // Check for any parent tweet ID
    if (tweet.inReplyToStatusId) {
      const parentTweet = await twitterService.getTweet(
        tweet.inReplyToStatusId,
      );
      if (parentTweet) {
        elizaLogger.info('[Tweet Merging] Successfully fetched parent tweet:', {
          parentId: tweet.inReplyToStatusId,
          parentText: parentTweet.text?.substring(0, 100),
          childTweetId: tweet.id,
        });

        upstreamTweets.inReplyChain.push(parentTweet);
        const parentUpstream = await fetchUpstreamTweets(
          parentTweet,
          twitterService,
          processedIds,
        );
        upstreamTweets.inReplyChain.push(...parentUpstream.inReplyChain);
        upstreamTweets.quotedTweets.push(...parentUpstream.quotedTweets);
        upstreamTweets.retweetedTweets.push(...parentUpstream.retweetedTweets);
      }
    }

    if (tweet.quotedStatusId) {
      const quotedTweet = await twitterService.getTweet(tweet.quotedStatusId);
      if (quotedTweet) {
        elizaLogger.info('[Tweet Merging] Successfully fetched quoted tweet:', {
          quotedId: tweet.quotedStatusId,
          quotedText: quotedTweet.text?.substring(0, 100),
          childTweetId: tweet.id,
        });

        upstreamTweets.quotedTweets.push(quotedTweet);
        const quotedUpstream = await fetchUpstreamTweets(
          quotedTweet,
          twitterService,
          processedIds,
        );
        upstreamTweets.inReplyChain.push(...quotedUpstream.inReplyChain);
        upstreamTweets.quotedTweets.push(...quotedUpstream.quotedTweets);
        upstreamTweets.retweetedTweets.push(...quotedUpstream.retweetedTweets);
      }
    }

    if (tweet.retweetedStatusId) {
      const retweetedTweet = await twitterService.getTweet(
        tweet.retweetedStatusId,
      );
      if (retweetedTweet) {
        elizaLogger.info(
          '[Tweet Merging] Successfully fetched retweeted tweet:',
          {
            retweetedId: tweet.retweetedStatusId,
            retweetedText: retweetedTweet.text?.substring(0, 100),
            childTweetId: tweet.id,
          },
        );

        upstreamTweets.retweetedTweets.push(retweetedTweet);
        const retweetedUpstream = await fetchUpstreamTweets(
          retweetedTweet,
          twitterService,
          processedIds,
        );
        upstreamTweets.inReplyChain.push(...retweetedUpstream.inReplyChain);
        upstreamTweets.quotedTweets.push(...retweetedUpstream.quotedTweets);
        upstreamTweets.retweetedTweets.push(
          ...retweetedUpstream.retweetedTweets,
        );
      }
    }

    return upstreamTweets;
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
    return upstreamTweets;
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
  tweets: Tweet[],
): Promise<TweetWithUpstream[]> {
  // Use a transaction for the entire operation
  return tweetQueries.processTweetsInTransaction(async (client) => {
    const processedTweets: TweetWithUpstream[] = [];
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

        // Map the tweet to our database format
        const dbTweet = mapTweet(tweet);
        dbTweet.agentId = runtime.agentId;

        // Fetch upstream tweets
        const upstreamTweets = await fetchUpstreamTweets(tweet, twitterService);

        // Map upstream tweets to database format and set agentId
        const mappedUpstream = {
          inReplyChain: upstreamTweets.inReplyChain.map((t) => {
            const mappedTweet = mapTweet(t);
            mappedTweet.agentId = runtime.agentId;
            return mappedTweet;
          }),
          quotedTweets: upstreamTweets.quotedTweets.map((t) => {
            const mappedTweet = mapTweet(t);
            mappedTweet.agentId = runtime.agentId;
            return mappedTweet;
          }),
          retweetedTweets: upstreamTweets.retweetedTweets.map((t) => {
            const mappedTweet = mapTweet(t);
            mappedTweet.agentId = runtime.agentId;
            return mappedTweet;
          }),
        };

        // Update thread info
        const totalRelatedTweets =
          mappedUpstream.inReplyChain.length +
          mappedUpstream.quotedTweets.length +
          mappedUpstream.retweetedTweets.length;

        dbTweet.isThreadMerged = totalRelatedTweets > 0;
        dbTweet.threadSize = totalRelatedTweets + 1;

        // Save all tweets to database
        await tweetQueries.saveTweetObject(dbTweet, client);
        for (const upstreamTweet of [
          ...mappedUpstream.inReplyChain,
          ...mappedUpstream.quotedTweets,
          ...mappedUpstream.retweetedTweets,
        ]) {
          await tweetQueries.saveTweetObject(upstreamTweet, client);
        }

        processedTweets.push({
          originalTweet: dbTweet,
          upstreamTweets: mappedUpstream,
        });
        processedIds.add(tweet.tweet_id);

        elizaLogger.info(
          `[Tweet Processing] Successfully fetched ${totalRelatedTweets + 1} upstream tweets`,
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
