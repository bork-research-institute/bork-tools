import type { TwitterDiscoveryConfigService } from '@/bork-protocol/plugins/twitter-discovery/services/twitter-discovery-config-service';
import type { AnalysisQueueService } from '@/services/analysis-queue.service';
import type { TwitterService } from '@/services/twitter-service';
import { elizaLogger } from '@elizaos/core';
import { SearchMode } from 'agent-twitter-client';

/**
 * Searches for tweets related to a specific token
 * @param tokenAddress The address of the token to search for
 * @param twitterService Twitter service for searching
 * @param twitterConfigService Service to get Twitter configuration
 * @param tweetQueueService Service to queue tweets for processing
 * @param recentlySearchedTokens Set of tokens that were recently searched
 * @returns The updated set of recently searched tokens
 */
export async function searchTokenTweets(
  tokenAddress: string,
  twitterService: TwitterService,
  twitterConfigService: TwitterDiscoveryConfigService,
  tweetQueueService: AnalysisQueueService,
  recentlySearchedTokens: Set<string>,
): Promise<Set<string>> {
  // Only process tokens we haven't recently searched
  if (recentlySearchedTokens.has(tokenAddress)) {
    return recentlySearchedTokens;
  }

  // Add to recently searched tokens
  recentlySearchedTokens.add(tokenAddress);

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
      tokenAddress,
      config.search.tweetLimits.searchResults,
      SearchMode.Top,
      '[TokenMonitor]',
      config.search.parameters,
      config.search.engagementThresholds,
    );

    if (!searchTweets.length) {
      elizaLogger.warn(
        `[TokenMonitor] No tweets found for term: ${tokenAddress}`,
      );
    }

    elizaLogger.info(
      `[TokenMonitor] Found ${searchTweets.length} tweets for term: ${tokenAddress}`,
    );

    // Add tweets to the queue
    await tweetQueueService.addTweets(searchTweets, 'search', 2);

    elizaLogger.info(
      `[TokenMonitor] Successfully queued search results for token: ${tokenAddress}`,
    );
  } catch (error) {
    elizaLogger.error(
      `[TokenMonitor] Error searching for term: ${tokenAddress}`,
      {
        token: tokenAddress,
        error: error instanceof Error ? error.message : String(error),
      },
    );
  }

  return recentlySearchedTokens;
}
