import type { EnrichedToken, TokenProfile } from '@/types/token-monitor/token';
import { filter, uniqBy } from 'ramda';
import { dexScreenerService } from './dexscreener-service';
import { marketDataService } from './market-data-service';
import { tokenEnrichmentService } from './token-enrichment-service';

export class TokenMonitoringService {
  private static instance: TokenMonitoringService;
  private isRunning = false;
  private readonly RATE_LIMIT_DELAY = 5000; // 5 seconds between DexScreener calls
  private readonly JUPITER_RATE_LIMIT = 100; // Process max 100 tokens per minute
  private readonly JUPITER_CALL_DELAY = 150; // 150ms between Jupiter calls
  private lastKnownTokens: Set<string> = new Set(); // Store token addresses to track new ones

  private constructor() {}

  public static getInstance(): TokenMonitoringService {
    if (!TokenMonitoringService.instance) {
      TokenMonitoringService.instance = new TokenMonitoringService();
    }
    return TokenMonitoringService.instance;
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
      console.error('Error fetching tokens:', error);
      return [];
    }
  }

  // TOOD For now we recheck the the tokens we already know as they could potentially become interesting
  private identifyNewTokens(tokens: TokenProfile[]): TokenProfile[] {
    const newTokens = tokens.filter(
      (token) => !this.lastKnownTokens.has(token.tokenAddress),
    );
    // Update our known tokens set
    for (const token of tokens) {
      this.lastKnownTokens.add(token.tokenAddress);
    }

    return newTokens;
  }

  private async enrichToken(token: TokenProfile): Promise<EnrichedToken> {
    try {
      const [metrics, priceInfo] = await Promise.all([
        tokenEnrichmentService.getTokenMetrics(token.tokenAddress),
        marketDataService.getTokenPrice(token.tokenAddress),
      ]);

      return {
        ...token,
        metrics: {
          ...metrics,
          marketCap: priceInfo
            ? priceInfo.price * Number(metrics.supply)
            : undefined,
          priceInfo: priceInfo || undefined,
        },
      };
    } catch (error) {
      console.error(`Error enriching token ${token.tokenAddress}:`, error);
      throw error;
    }
  }

  private async enrichTokens(tokens: TokenProfile[]): Promise<EnrichedToken[]> {
    const enrichedTokens: EnrichedToken[] = [];

    // Process tokens in chunks to respect rate limits
    for (const token of tokens.slice(0, this.JUPITER_RATE_LIMIT)) {
      enrichedTokens.push(await this.enrichToken(token));
      await new Promise((resolve) =>
        setTimeout(resolve, this.JUPITER_CALL_DELAY),
      );
    }

    return enrichedTokens;
  }

  public async startMonitoring(
    onNewTokens: (tokens: EnrichedToken[]) => void,
    onError?: (error: Error) => void,
  ): Promise<void> {
    if (this.isRunning) {
      throw new Error('Monitoring is already running');
    }

    this.isRunning = true;

    const monitor = async () => {
      while (this.isRunning) {
        try {
          const solanaTokens = await this.fetchAndFilterSolanaTokens();
          if (solanaTokens.length > 0) {
            const enrichedTokens = await this.enrichTokens(solanaTokens);
            onNewTokens(enrichedTokens);
          }

          await new Promise((resolve) =>
            setTimeout(resolve, this.RATE_LIMIT_DELAY),
          );
        } catch (error) {
          if (onError && error instanceof Error) {
            onError(error);
          }
          await new Promise((resolve) =>
            setTimeout(resolve, this.RATE_LIMIT_DELAY),
          );
        }
      }
    };

    monitor();
  }

  public stopMonitoring(): void {
    this.isRunning = false;
  }

  public clearTokenHistory(): void {
    this.lastKnownTokens.clear();
  }
}

// Export a singleton instance
export const tokenMonitoringService = TokenMonitoringService.getInstance();
