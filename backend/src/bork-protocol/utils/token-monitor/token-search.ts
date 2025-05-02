import { tokenQueries } from '@/db/token-queries';
import type { TweetQueueService } from '@/services/twitter/analysis-queue.service';
import type { TwitterConfigService } from '@/services/twitter/twitter-config-service';
import type { TwitterService } from '@/services/twitter/twitter-service';
import type {
  EnrichedToken,
  InterestingToken,
} from '@/types/token-monitor/token';
import { elizaLogger } from '@elizaos/core';
import { SearchMode } from 'agent-twitter-client';

/**
 * Searches for tweets related to a specific token
 * @param token The interesting token to search for
 * @param twitterService Twitter service for searching
 * @param twitterConfigService Service to get Twitter configuration
 * @param tweetQueueService Service to queue tweets for processing
 * @param recentlySearchedTokens Set of tokens that were recently searched
 * @param enrichedToken Optional enriched token for creating snapshot
 * @returns The updated set of recently searched tokens
 */
export async function searchTokenTweets(
  token: InterestingToken,
  twitterService: TwitterService,
  twitterConfigService: TwitterConfigService,
  tweetQueueService: TweetQueueService,
  recentlySearchedTokens: Set<string>,
  enrichedToken?: EnrichedToken,
): Promise<Set<string>> {
  // Only process tokens we haven't recently searched
  if (recentlySearchedTokens.has(token.tokenAddress)) {
    return recentlySearchedTokens;
  }

  // Add to recently searched tokens
  recentlySearchedTokens.add(token.tokenAddress);

  // Limit the size of recently searched tokens cache
  if (recentlySearchedTokens.size > 100) {
    // Remove oldest entries (just a crude approach)
    const entries = Array.from(recentlySearchedTokens);
    for (let i = 0; i < 20; i++) {
      recentlySearchedTokens.delete(entries[i]);
    }
  }

  const config = await twitterConfigService.getConfig();

  try {
    const { tweets: searchTweets } = await twitterService.searchTweets(
      token.tokenAddress,
      config.search.tweetLimits.searchResults,
      SearchMode.Top,
      '[TokenMonitor]',
      config.search.parameters,
      config.search.engagementThresholds,
    );

    // Create snapshot with tweet IDs if enrichedToken is provided
    if (enrichedToken) {
      const tweetIds = searchTweets.map((tweet) => tweet.id);
      await tokenQueries.createSnapshot(enrichedToken, tweetIds);
    }

    if (!searchTweets.length) {
      elizaLogger.warn(
        `[TokenMonitor] No tweets found for term: ${token.tokenAddress}`,
      );
    }

    elizaLogger.info(
      `[TokenMonitor] Found ${searchTweets.length} tweets for term: ${token.tokenAddress}`,
    );

    // Add tweets to the queue
    await tweetQueueService.addTweets(searchTweets, 'search', 2);

    elizaLogger.info(
      `[TokenMonitor] Successfully queued search results for token: ${token.tokenAddress}`,
    );
  } catch (error) {
    elizaLogger.error(
      `[TokenMonitor] Error searching for term: ${token.tokenAddress}`,
      {
        token: token.tokenAddress,
        error: error instanceof Error ? error.message : String(error),
      },
    );
  }

  return recentlySearchedTokens;
}
