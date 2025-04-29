// TO-DO: run the token monitoring service here alongside the other research clients and have it run a search instance on a periodic basis

// biome-ignore lint/correctness/noNodejsModules: <explanation>
import { EventEmitter } from 'node:events';
import { tokenQueries } from '@/db/token-queries';
import { dexScreenerService } from '@/services/token-monitor/dexscreener-service';
import { marketDataService } from '@/services/token-monitor/market-data-service';
import { tokenEnrichmentService } from '@/services/token-monitor/token-enrichment-service';
import type { TweetQueueService } from '@/services/twitter/analysis-queue.service';
import { TwitterConfigService } from '@/services/twitter/twitter-config-service';
import type { TwitterService } from '@/services/twitter/twitter-service';
import type {
  EnrichedToken,
  InterestingToken,
  TokenProfile,
} from '@/types/token-monitor/token';
import {
  checkForInterestingTokens,
  clearOldInterestingTokens,
  getTopInterestingTokens,
  identifyIfInteresting,
  identifyNewTokens,
} from '@/utils/token-monitor/filter-tokens-by-interest';
import { searchTokenTweets } from '@/utils/token-monitor/token-search';
import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { filter, uniqBy } from 'ramda';

/**
 * Client that monitors for interesting tokens on Solana and searches for related tweets
 * Combines token monitoring service logic directly for more efficient processing
 */
export class TokenMonitorClient extends EventEmitter {
  private twitterConfigService: TwitterConfigService;
  private twitterService: TwitterService;
  private readonly runtime: IAgentRuntime;
  private readonly tweetQueueService: TweetQueueService;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  private recentlySearchedTokens: Set<string> = new Set(); // To avoid searching for the same token repeatedly
  private isMonitoringStarted = false;

  // Token monitoring properties
  private lastKnownTokens: Set<string> = new Set(); // Store token addresses to track new ones
  private interestingTokens: Map<string, InterestingToken> = new Map(); // Store tokens worth tweeting about
  private readonly RATE_LIMIT_DELAY = 5000; // 5 seconds between DexScreener calls
  private readonly JUPITER_CALL_DELAY = 150; // 150ms between Jupiter calls

  constructor(
    twitterService: TwitterService,
    runtime: IAgentRuntime,
    tweetQueueService: TweetQueueService,
  ) {
    super();
    this.twitterService = twitterService;
    this.twitterConfigService = new TwitterConfigService(runtime);
    this.runtime = runtime;
    this.tweetQueueService = tweetQueueService;
  }

  async start(): Promise<void> {
    elizaLogger.info('[TokenMonitor] Starting token monitoring client');

    if (!this.isMonitoringStarted) {
      // Start the token monitoring process
      this.isMonitoringStarted = true;
      this.startMonitoringProcess();
    }

    await this.onReady();
  }

  async stop(): Promise<void> {
    elizaLogger.info('[TokenMonitor] Stopping token monitoring client');
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }

    // Stop token monitoring
    this.isMonitoringStarted = false;
  }

  private async fetchAndFilterSolanaTokens(): Promise<TokenProfile[]> {
    try {
      const [latestTokens, topTokens, tokens] = await Promise.all([
        dexScreenerService.getLatestTokenBoosts(),
        dexScreenerService.getLatestTokenProfiles(),
        dexScreenerService.getTopTokenBoosts(),
      ]);

      // First filter for Solana tokens, then ensure unique by address
      const solanaTokens = filter(
        (token: TokenProfile) => token.chainId === 'solana',
        [...latestTokens, ...topTokens, ...tokens],
      );

      return uniqBy((token: TokenProfile) => token.tokenAddress, solanaTokens);
    } catch (error) {
      elizaLogger.error('[TokenMonitor] Error fetching tokens:', { error });
      return [];
    }
  }

  private async enrichToken(token: TokenProfile): Promise<EnrichedToken> {
    try {
      const [metrics, priceInfo] = await Promise.all([
        tokenEnrichmentService.getTokenMetrics(token.tokenAddress),
        marketDataService.getTokenPrice(token.tokenAddress),
      ]);

      const enrichedToken = {
        ...token,
        metrics: {
          ...metrics,
          marketCap: priceInfo
            ? priceInfo.price * Number(metrics.supply)
            : undefined,
          priceInfo: priceInfo || undefined,
        },
      };

      // Store token snapshot
      await tokenQueries.createSnapshot(enrichedToken);

      return enrichedToken;
    } catch (error) {
      elizaLogger.error(
        `[TokenMonitor] Error enriching token ${token.tokenAddress}:`,
        { error },
      );
      throw error;
    }
  }

  /**
   * Gets the most interesting tokens from the monitoring
   * @param limit Maximum number of tokens to return
   * @returns Array of interesting tokens
   */
  public getInterestingTokens(limit = 5): InterestingToken[] {
    return getTopInterestingTokens(this.interestingTokens, limit);
  }

  private async startMonitoringProcess(): Promise<void> {
    elizaLogger.info('[TokenMonitor] Starting token monitoring process');

    const monitor = async () => {
      while (this.isMonitoringStarted) {
        try {
          // Clear old tokens every cycle
          this.interestingTokens = clearOldInterestingTokens(
            this.interestingTokens,
          );

          // Fetch and process tokens
          const solanaTokens = await this.fetchAndFilterSolanaTokens();

          if (solanaTokens.length > 0) {
            // Look for new tokens
            const { newTokens, updatedKnownTokens } = identifyNewTokens(
              solanaTokens,
              this.lastKnownTokens,
            );

            // Update known tokens set
            this.lastKnownTokens = updatedKnownTokens;

            elizaLogger.debug(
              `[TokenMonitor] Found ${newTokens.length} new tokens out of ${solanaTokens.length} total`,
            );

            // Process each new token one at a time
            for (const token of newTokens) {
              try {
                // Add small delay between tokens to respect rate limits
                await new Promise((resolve) =>
                  setTimeout(resolve, this.JUPITER_CALL_DELAY),
                );

                // Enrich the token with additional data
                const enrichedToken = await this.enrichToken(token);

                // Evaluate if token is interesting
                const interestingToken = identifyIfInteresting(
                  enrichedToken,
                  this.interestingTokens,
                );

                // If interesting, immediately search for and process related tweets
                if (interestingToken) {
                  this.recentlySearchedTokens = await searchTokenTweets(
                    interestingToken,
                    this.twitterService,
                    this.twitterConfigService,
                    this.tweetQueueService,
                    this.recentlySearchedTokens,
                  );
                }
              } catch (err) {
                elizaLogger.error('[TokenMonitor] Error processing token:', {
                  token: token.tokenAddress,
                  error: err instanceof Error ? err.message : String(err),
                });
              }
            }
          }

          await new Promise((resolve) =>
            setTimeout(resolve, this.RATE_LIMIT_DELAY),
          );
        } catch (error) {
          elizaLogger.error('[TokenMonitor] Error in monitoring cycle:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });

          await new Promise((resolve) =>
            setTimeout(resolve, this.RATE_LIMIT_DELAY),
          );
        }
      }
    };

    monitor();
  }

  private async onReady() {
    // Check for interesting tokens on startup
    await this.checkForInterestingTokens();

    // Schedule periodic check for interesting tokens
    this.searchTimeout = setTimeout(
      () => this.checkForInterestingTokens(),
      Number(this.runtime.getSetting('TWITTER_POLL_INTERVAL') || 60) * 1000,
    );
  }

  private async checkForInterestingTokens() {
    try {
      this.recentlySearchedTokens = await checkForInterestingTokens(
        this.getInterestingTokens.bind(this),
        this.twitterService,
        this.twitterConfigService,
        this.tweetQueueService,
        this.recentlySearchedTokens,
      );
    } catch (error) {
      elizaLogger.error('[TokenMonitor] Error in checkForInterestingTokens:', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      // Schedule next check
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      this.searchTimeout = setTimeout(
        () => this.checkForInterestingTokens(),
        Number(this.runtime.getSetting('TWITTER_POLL_INTERVAL') || 60) * 1000,
      );
    }
  }

  public clearTokenHistory(): void {
    this.lastKnownTokens.clear();
    this.interestingTokens.clear();
    this.recentlySearchedTokens.clear();
  }
}

export default TokenMonitorClient;
