import type {
  EnrichedToken,
  InterestingToken,
  TokenProfile,
} from '@/bork-protocol/plugins/token-monitor/types/token';
import { searchTokenTweets } from '@/bork-protocol/plugins/token-monitor/utils/token-search';
import type { TwitterDiscoveryConfigService } from '@/bork-protocol/plugins/twitter-discovery/services/twitter-discovery-config-service';
import type { AnalysisQueueService } from '@/services/analysis-queue.service';
import type { TwitterService } from '@/services/twitter-service';
import { elizaLogger } from '@elizaos/core';

/**
 * Clears old interesting tokens to prevent stale data
 * @param interestingTokens Map of interesting tokens
 * @param maxAgeHours Maximum age of tokens to keep (in hours)
 * @returns Updated map of interesting tokens
 */
export function clearOldInterestingTokens(
  interestingTokens: Map<string, InterestingToken>,
  maxAgeHours = 24,
): Map<string, InterestingToken> {
  const now = new Date();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  const updatedTokens = new Map(interestingTokens);

  for (const [address, token] of updatedTokens.entries()) {
    const tokenAge = now.getTime() - token.detectedAt.getTime();
    if (tokenAge > maxAgeMs) {
      updatedTokens.delete(address);
    }
  }

  return updatedTokens;
}

/**
 * Identifies if a token is interesting based on various metrics
 * @param token Enriched token to evaluate
 * @param interestingTokens Current map of interesting tokens (will be updated)
 * @returns Token with interest information if interesting, null otherwise
 */
export function identifyIfInteresting(
  token: EnrichedToken,
  interestingTokens: Map<string, InterestingToken>,
): InterestingToken | null {
  try {
    // Skip tokens without necessary metrics
    if (!token.metrics || !token.tokenAddress) {
      return null;
    }

    let interestReason = '';
    let score = 0;
    const metrics = token.metrics;

    // Check various signals that make a token interesting

    // New token with substantial liquidity
    if (
      metrics.liquidityMetrics &&
      metrics.liquidityMetrics.totalLiquidity > 25000
    ) {
      interestReason = 'New token with substantial liquidity';
      score += 40;
    }

    // High holder count for a new token
    if (metrics.holderCount > 100) {
      interestReason = interestReason || 'High holder count for a new token';
      score += 30;
    }

    // Recent volume spike
    if (
      metrics.liquidityMetrics?.volumeMetrics?.isVolumeIncreasing &&
      metrics.liquidityMetrics.volumeMetrics.volumeChange > 50
    ) {
      interestReason = interestReason || 'Recent volume spike';
      score += 30;
    }

    // Substantial market cap
    if (metrics.marketCap && metrics.marketCap > 50000) {
      interestReason = interestReason || 'Substantial market cap';
      score += 10;
    }

    // Acceptable token mint authority status
    if (metrics.mintAuthority === null) {
      // No mint authority (renounced) is a good sign
      score += 10;
    } else if (metrics.isMintable) {
      // Mintable tokens are riskier
      score -= 20;
    }

    // Skip tokens that don't meet the interest threshold
    if (score < 30) {
      return null;
    }

    // If it's interesting enough, create an interesting token object
    const interestingToken: InterestingToken = {
      ...token,
      interestReason,
      score,
      detectedAt: new Date(),
    };

    // Update the passed map of interesting tokens
    interestingTokens.set(token.tokenAddress, interestingToken);

    elizaLogger.info(
      `[TokenMonitor] Found interesting token: ${token.tokenAddress}`,
    );

    return interestingToken;
  } catch (err) {
    elizaLogger.error('[TokenMonitor] Error evaluating token:', {
      token: token.tokenAddress,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Identifies new tokens from a list of tokens
 * @param tokens List of tokens to check
 * @param lastKnownTokens Set of token addresses that have been seen before
 * @returns Array of new tokens and updated set of known tokens
 */
export function identifyNewTokens(
  tokens: TokenProfile[],
  lastKnownTokens: Set<string>,
): { newTokens: TokenProfile[]; updatedKnownTokens: Set<string> } {
  const updatedKnownTokens = new Set(lastKnownTokens);

  const newTokens = tokens.filter(
    (token) => !updatedKnownTokens.has(token.tokenAddress),
  );

  // Update our known tokens set
  for (const token of tokens) {
    updatedKnownTokens.add(token.tokenAddress);
  }

  return { newTokens, updatedKnownTokens };
}

/**
 * Gets the most interesting tokens from a map
 * @param interestingTokens Map of interesting tokens
 * @param limit Maximum number of tokens to return
 * @returns Array of interesting tokens sorted by score
 */
export function getTopInterestingTokens(
  interestingTokens: Map<string, InterestingToken>,
  limit = 5,
): InterestingToken[] {
  const tokens = Array.from(interestingTokens.values());

  // Sort by score (highest first)
  return tokens.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Checks for interesting tokens and initiates tweet searches
 * @param interestingTokensGetter Function to get interesting tokens
 * @param twitterService Twitter service for searching
 * @param twitterConfigService Service to get Twitter configuration
 * @param tweetQueueService Service to queue tweets for processing
 * @param recentlySearchedTokens Set of tokens that were recently searched
 * @returns The updated set of recently searched tokens
 */
export async function checkForInterestingTokens(
  interestingTokensGetter: (limit: number) => InterestingToken[],
  twitterService: TwitterService,
  twitterConfigService: TwitterDiscoveryConfigService,
  tweetQueueService: AnalysisQueueService,
  recentlySearchedTokens: Set<string>,
): Promise<Set<string>> {
  elizaLogger.info('[TokenMonitor] Checking for interesting tokens');

  try {
    // Get interesting tokens
    const interestingTokens = interestingTokensGetter(5);

    if (interestingTokens.length === 0) {
      elizaLogger.info('[TokenMonitor] No interesting tokens found');
      return recentlySearchedTokens;
    }

    elizaLogger.debug('[TokenMonitor] Found interesting tokens:', {
      count: interestingTokens.length,
      tokens: interestingTokens.map((t) => ({
        address: t.tokenAddress,
        reason: t.interestReason,
        score: t.score,
      })),
    });

    // Search for tweets about each token if not recently searched
    const updatedRecentlySearchedTokens = new Set(recentlySearchedTokens);
    for (const token of interestingTokens) {
      if (!updatedRecentlySearchedTokens.has(token.tokenAddress)) {
        const searchTweets = await searchTokenTweets(
          token.tokenAddress,
          twitterService,
          twitterConfigService,
          tweetQueueService,
        );

        // Add token to recently searched set if we found any tweets
        if (searchTweets.length > 0) {
          updatedRecentlySearchedTokens.add(token.tokenAddress);
        }
      }
    }

    return updatedRecentlySearchedTokens;
  } catch (error) {
    elizaLogger.error('[TokenMonitor] Error checking for interesting tokens:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return recentlySearchedTokens;
  }
}
