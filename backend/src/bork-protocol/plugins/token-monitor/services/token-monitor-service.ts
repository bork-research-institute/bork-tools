import { tokenQueries } from '@/bork-protocol/db/token-queries';
import { dexScreenerService } from '@/bork-protocol/plugins/token-monitor/services/dexscreener-service';
import { marketDataService } from '@/bork-protocol/plugins/token-monitor/services/market-data-service';
import { tokenEnrichmentService } from '@/bork-protocol/plugins/token-monitor/services/token-enrichment-service';
import { TokenMonitorConfigService } from '@/bork-protocol/plugins/token-monitor/services/token-monitor-config-service';
import { ServiceTypeExtension } from '@/bork-protocol/plugins/token-monitor/types/service-type-extension';
import type {
  EnrichedToken,
  InterestingToken,
  TokenProfile,
} from '@/bork-protocol/plugins/token-monitor/types/token';
import {
  checkForInterestingTokens,
  clearOldInterestingTokens,
  getTopInterestingTokens,
  identifyIfInteresting,
  identifyNewTokens,
} from '@/bork-protocol/plugins/token-monitor/utils/filter-tokens-by-interest';
import { searchTokenTweets } from '@/bork-protocol/plugins/token-monitor/utils/token-search';
import { TwitterDiscoveryConfigService } from '@/bork-protocol/plugins/twitter-discovery/services/twitter-discovery-config-service';
import { AnalysisQueueService } from '@/services/analysis-queue.service';
import { TwitterService } from '@/services/twitter-service';
import {
  type IAgentRuntime,
  Service,
  type ServiceType,
  elizaLogger,
} from '@elizaos/core';
import { filter, uniqBy } from 'ramda';

export class TokenMonitorService extends Service {
  private twitterService: TwitterService;
  private twitterConfigService: TwitterDiscoveryConfigService;
  private analysisQueueService: AnalysisQueueService;
  private tokenMonitorConfigService: TokenMonitorConfigService;
  // To avoid searching for the same token repeatedly
  private recentlySearchedTokens: Set<string> = new Set();
  // Store token addresses to track new ones
  private lastKnownTokens: Set<string> = new Set();
  // Store tokens worth tweeting about
  private interestingTokens: Map<string, InterestingToken> = new Map();

  static get serviceType(): ServiceType {
    return ServiceTypeExtension.TOKEN_MONITOR as unknown as ServiceType;
  }

  async initialize(runtime: IAgentRuntime): Promise<void> {
    // TODO Should probably be in the token monitor config service
    this.twitterConfigService = runtime.services.get(
      TwitterDiscoveryConfigService.serviceType,
    ) as TwitterDiscoveryConfigService;
    if (!this.twitterConfigService) {
      elizaLogger.error(
        '[TokenMonitorService] Token monitor config service not found',
      );
      return;
    }
    this.analysisQueueService = runtime.services.get(
      AnalysisQueueService.serviceType,
    ) as AnalysisQueueService;
    if (!this.analysisQueueService) {
      elizaLogger.error(
        '[TokenMonitorService] Analysis queue service not found',
      );
    }
    this.twitterService = runtime.services.get(
      TwitterService.serviceType,
    ) as TwitterService;
    if (!this.twitterService) {
      elizaLogger.error('[TokenMonitorService] Twitter service not found');
      return;
    }
    this.tokenMonitorConfigService = runtime.services.get(
      TokenMonitorConfigService.serviceType,
    ) as TokenMonitorConfigService;
    if (!this.tokenMonitorConfigService) {
      elizaLogger.error(
        '[TokenMonitorService] Token monitor config service not found',
      );
    }
  }

  public async monitorTokens(): Promise<void> {
    // Clear old tokens every cycle
    this.interestingTokens = clearOldInterestingTokens(this.interestingTokens);
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
        `[TokenMonitorService] Found ${newTokens.length} new tokens out of ${solanaTokens.length} total`,
      );

      // Process each new token one at a time
      for (const token of newTokens) {
        try {
          // Add small delay between tokens to respect rate limits
          await new Promise((resolve) =>
            setTimeout(
              resolve,
              this.tokenMonitorConfigService.getJupiterCallDelay(),
            ),
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
              this.analysisQueueService,
              this.recentlySearchedTokens,
            );
          }
        } catch (err) {
          elizaLogger.error('[TokenMonitorService] Error processing token:', {
            token: token.tokenAddress,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
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
      elizaLogger.error('[TokenMonitorService] Error fetching tokens:', {
        error,
      });
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
        `[TokenMonitorService] Error enriching token ${token.tokenAddress}:`,
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

  public async checkForInterestingTokens() {
    try {
      this.recentlySearchedTokens = await checkForInterestingTokens(
        this.getInterestingTokens.bind(this),
        this.twitterService,
        this.twitterConfigService,
        this.analysisQueueService,
        this.recentlySearchedTokens,
      );
    } catch (error) {
      elizaLogger.error(
        '[TokenMonitorService] Error in checkForInterestingTokens:',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  public clearTokenHistory(): void {
    this.lastKnownTokens.clear();
    this.interestingTokens.clear();
    this.recentlySearchedTokens.clear();
  }
}

export const tokenMonitorService = new TokenMonitorService();
